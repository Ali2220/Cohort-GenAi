import dotenv from 'dotenv'
dotenv.config()
import { ChatGroq } from '@langchain/groq'
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { TavilySearch } from "@langchain/tavily";

async function main() {

    // STEP 1: LLM (Brain) Setup
    const model = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: "openai/gpt-oss-120b",
        temperature: 0,
    });

    // STEP 2: Tools (Hands) Setup
    const search = new TavilySearch({
        maxResults: 3,
        topic: "general",
    });

    // STEP 3: Agent Creation
    // createReactAgent LLM aur Tools ko apas mein jorta hai.
    // Ye background mein ek "Reasoning" aur "Action" loop (ReAct) chalata hai.
    const agent = createReactAgent({
        llm: model,
        tools: [search],
    })

    // STEP 4: Invocation (Sawal Poochna)
    const result = await agent.invoke({
        messages: [
            {
                role: "human",
                content: "what is the current weather in Karachi"
            }
        ]
    })

    // Hum sirf aakhri message (Assistant ka final answer) print kar rahe hain.
    console.log(result.messages[result.messages.length - 1].content);
}

main()