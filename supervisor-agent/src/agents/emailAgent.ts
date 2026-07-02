import { sendEmail } from "../tools/email.ts"
import { model } from "../model.ts"
import { ToolNode } from "@langchain/langgraph/prebuilt"

const emailTools = [sendEmail]
const toolNode = new ToolNode(emailTools)

// email node
export async function emailAgent(state: any) {
    const SYSTEM_PROMPT = `You are an email assistant.
Compose professional emails based on natural language requests.

CRITICAL WARNING: Extract the EXACT email address provided by the user in the conversation history. Do NOT hallucinate, guess, or use placeholder emails (like name@example.com) under any circumstances. If an email is provided, use it exactly as it is.

Use send_email to send the message.
Always confirm what was sent in your final response.`

    const llmWithTools = model.bindTools(emailTools)

    const response = await llmWithTools.invoke([
        {
            role: 'system',
            content: SYSTEM_PROMPT
        },
        ...state.messages
    ])

    if (response.tool_calls?.length) {
        const toolResults = await toolNode.invoke({
            messages: [response]
        })

        const finalResponse = await model.invoke([
            {
                role: 'system',
                content: SYSTEM_PROMPT
            },
            ...state.messages,
            response,
            ...toolResults.messages
        ])

        return {
            messages: [finalResponse]
        }
    }

    return {
        messages: [response]
    }
}