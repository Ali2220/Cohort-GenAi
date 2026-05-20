import dotenv from 'dotenv'
dotenv.config()
import { ChatGroq } from '@langchain/groq'
import { createEvent, getEvents } from './tools.js'
import { END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import type { AIMessage } from '@langchain/core/messages'

const tools: any = [createEvent, getEvents]

const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY as string,
    model: "openai/gpt-oss-120b",
    temperature: 0,
}).bindTools(tools)


// Assistant Node
async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
}

// Tool Node
const toolNode = new ToolNode(tools)

// Conditional Edge
function shouldContinue(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage

    if (lastMessage.tool_calls?.length) {
        return 'tools';
    }

    return '__end__';
}

// Build the Graph
const graph = new StateGraph(MessagesAnnotation)
    // Nodes add karo
    .addNode('assistant', callModel)
    .addNode('tools', toolNode)
    // Edges
    .addEdge(START, 'assistant')
    .addConditionalEdges('assistant', shouldContinue, {
        tools: 'tools',
        __end__: END,
    })
    .addEdge('tools', 'assistant');

const app = graph.compile()

async function main() {

    const result = await app.invoke({
        messages: [
            {
                role: 'human',
                content: 'Please create the meeting for tomorrow with umer at 2 pm at johar'
            }
        ]
    })

    console.log(result.messages[result.messages.length - 1]?.content);

}

main()