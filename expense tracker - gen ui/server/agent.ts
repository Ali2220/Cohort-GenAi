import { ChatGroq } from "@langchain/groq"
import {MessagesAnnotation} from "@langchain/langgraph"

const llm = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0,
})

async function callModel(state: typeof MessagesAnnotation.State){
    const response = await llm.invoke([
        {
            role: 'human',
            content: "You are an ai assistant that decides...."
        },
        ...state.messages
    ])

    
}