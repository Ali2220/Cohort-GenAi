import dotenv from 'dotenv'
dotenv.config()

import { ChatGroq } from '@langchain/groq'
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { TavilySearch } from "@langchain/tavily";
import { tool } from '@langchain/core/tools';
import * as z from "zod";
import * as fs from "node:fs/promises";
import readLine from 'node:readline/promises'
import { MemorySaver } from "@langchain/langgraph"; // MemorySaver: Ye conversation ko temporary storage (RAM) mein save karta hai

async function main() {

    const model = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: "llama-3.3-70b-versatile",
        temperature: 0,
    });

    // Hands (Tools) Setup
    // Tavily: Internet search ke liye
    const search = new TavilySearch({
        maxResults: 3,
        topic: "general",
    });


    const myEvents = [
        { date: "2026-05-12", event: "AI Workshop at 10:00 AM" },
        { date: "2026-05-13", event: "Meeting with Client at 2:00 PM" },
        { date: "2026-05-15", event: "Exam Submission Deadline" }
    ]

    // Custom Tool: LangChain ko batana ke ye function kaise chalana hai
    const calendarTool = tool(
        async ({ date }) => {
            console.log(`[Tool]: Checking calendar for date: ${date}`);
            const eventFound = myEvents.find(e => e.date === date)
            return eventFound ? eventFound.event : "No events found for this date. You are free!";
        },
        {
            name: "check_calendar",
            description: "Specific date (YYYY-MM-DD) par meetings check karne ke liye.",
            schema: z.object({
                date: z.string().describe("The date to check in YYYY-MM-DD format."),
            }),
        }
    );

    // Memory (Checkpointer) Setup - Conversation ko yad rkhta hai.
    const checkpointer = new MemorySaver()

    // Agent Creation: Brain + Hands + Memory ka milap
    const agent = createReactAgent({
        llm: model,
        tools: [search, calendarTool],
        checkpointer // Agent ko memory storage assign kar di
    })

    const rl = readLine.createInterface({ input: process.stdin, output: process.stdout })

    while (true) {
        const question = await rl.question("User: ")

        if (question.toLowerCase() === "exit") break;

        // Invocation: AI ko sawal bhej kar jawab lena
        const result = await agent.invoke(
            {
                // Note: Memory hone ki wajah se aap sirf NAYA message bhejte hain, 
                // purani history LangGraph khud hi "checkpointer" se utha leta hai.
                messages: [
                    {
                        role: "system",
                        content: `You are a helpful assistant. Today is ${new Date().toUTCString()}.`
                    },
                    {
                        role: "human",
                        content: question
                    }
                ],
            },
            {
                // thread_id: Ye sab se important hai! 
                // Ye ek unique key hai. Agar thread_id "user-123" hai, to AI 
                // isi ID ki pichli saari chat yaad rakhega.
                configurable: { thread_id: "user-123" }
            }
        )

        console.log("Assistant: ", result.messages[result.messages.length - 1].content);
    }

    rl.close()

    // Agent ke logic ko graph image mein convert karna
    const drawableGraph = await agent.getGraphAsync();
    const image = await drawableGraph.drawMermaidPng();
    const imageBuffer = new Uint8Array(await image.arrayBuffer());
    await fs.writeFile("graph.png", imageBuffer);
    console.log("Graph visualization saved as graph.png");
}

main()