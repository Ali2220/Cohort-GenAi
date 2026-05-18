import dotenv from 'dotenv';
dotenv.config();
import { tool } from '@langchain/core/tools';
import { ChatGroq } from '@langchain/groq';
import { StateGraph, MessagesAnnotation, END, START, MemorySaver } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { TavilySearch } from '@langchain/tavily';
import * as z from 'zod';
import fs from "node:fs/promises"
import readLine from "node:readline/promises"

// 1. TOOLS (Haath)
// Internet search tool
const search = new TavilySearch({
    maxResults: 3,
    topic: 'general',
});

// Fake calendar data
const myEvents = [
    { date: '2026-05-12', event: 'AI Workshop at 10:00 AM' },
    { date: '2026-05-13', event: 'Meeting with Client at 2:00 PM' },
    { date: '2026-05-15', event: 'Exam Submission Deadline' },
];

// Custom Calendar Tool – ek function jise LLM call kar sake
const calendarTool = tool(
    async ({ date }) => {
        console.log(`[Tool]: Checking calendar for date: ${date}`);
        const eventFound = myEvents.find(e => e.date === date);
        return eventFound
            ? eventFound.event
            : 'No events found for this date. You are free!';
    },
    {
        name: 'check_calendar', // tool ka naam
        description: 'Specific date (YYYY-MM-DD) par meetings check karne ke liye.',
        schema: z.object({
            date: z.string().describe('The date to check in YYYY-MM-DD format.'),
        }),
    }
);

// Saare tools ek array mein
const tools = [search, calendarTool];

// 2. TOOL NODE (Automatic executor)
// Ye node tools ko execute karta hai, results messages mein jodta hai
const toolNode = new ToolNode(tools);

// 3. LLM (Dimaag)
// Groq model ko tools ke saath bind kar diya – ab ye tool calls bana sakta hai
const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: 'openai/gpt-oss-120b',
    temperature: 0,
}).bindTools(tools);

// 4. AGENT NODE (LLM call)
async function callModel(state) {
    // State.messages mein ab tak ke saare messages hain
    const response = await llm.invoke(state.messages);
    // Naya AI message (ho sakta hai tool_calls ho) state mein add kar do
    return { messages: [response] };
}

// Memory Saver
const checkPointer = new MemorySaver()

// 5. CONDITIONAL ROUTING
function shouldContinue(state) {
    const lastMessage = state.messages[state.messages.length - 1];

    if (lastMessage.tool_calls?.length > 0) {
        return 'tools';
    }

    return '__end__';
}

// 6. GRAPH BANANA 
// MessagesAnnotation – built-in state jo messages array handle karta hai
const graph = new StateGraph(MessagesAnnotation)
    // Nodes add karo
    .addNode('llm', callModel)
    .addNode('tools', toolNode)
    // Edges
    .addEdge(START, 'llm')
    .addConditionalEdges('llm', shouldContinue, {
        tools: 'tools',
        __end__: END,
    })
    .addEdge('tools', 'llm');

const agent = graph.compile({ checkpointer: checkPointer });

// 7. RUN KARO
async function main() {

    // print the graph
    const drawableGraph = await agent.getGraphAsync();
    const image = await drawableGraph.drawMermaidPng();
    const imageBuffer = new Uint8Array(await image.arrayBuffer());
    await fs.writeFile("graph.png", imageBuffer);
    console.log("Success: Graph visualization saved as graph.png");

    // user input
    const rl = readLine.createInterface({ input: process.stdin, output: process.stdout })
    while (true) {

        const question = await rl.question("UserInput: ")

        if (question.toLowerCase() === 'exit') {
            break;
        }

        const result = await agent.invoke(
            {
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful assistant. Today's date is ${new Date().toUTCString()}.`,
                    },
                    {
                        role: 'human',
                        content: question,
                    },
                ],
            },
            { configurable: { thread_id: 'user-123' } }
        );

        // Last message assistant ka final jawab hota hai
        console.log('AI:', result.messages[result.messages.length - 1].content);
    }
    rl.close()
}

main();