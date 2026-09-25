// AGENT - Agentic loop + commands
import { groq, mcpClient, state } from "./config.js"
import { getTools, executeTool } from "./mcp.js"

/**
 * Agentic loop: LLM → tool call? → execute → repeat jab tak answer na mile
 */
export async function processQuery(initialMessages: any[]) {
    const tools = await getTools()

    const messages: any[] = [
        { role: "system", content: state.systemContext },
        ...initialMessages,
    ]

    while (true) {
        const response = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages,
            tools,
            tool_choice: "auto",
        })

        const message = response.choices[0]?.message

        // Tool calls nahi → final answer
        if (!message?.tool_calls || message.tool_calls.length === 0) {
            return message?.content
        }

        messages.push(message)

        for (const toolCall of message.tool_calls) {
            const toolName = toolCall.function.name
            const args = JSON.parse(toolCall.function.arguments)

            const toolResult = await executeTool(toolName, args)

            messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: toolResult,
            })
        }
    }
}

/**
 * "jobTitle=\"Backend Dev\" company=ACME" → object mein convert
 */
export function parseArgs(argString: string): Record<string, string> {
    const args: Record<string, string> = {}
    const regex = /(\w+)=(?:"([^"]*)"|(\S+))/g
    let match

    while ((match = regex.exec(argString))) {
        args[match[1]] = match[2] ?? match[3]
    }

    return args
}

/**
 * /prompts command handler
 */
export async function handlePromptsCommand() {
    const allPrompts = await mcpClient.listPrompts()

    console.log("\n📝 Available prompts:")
    allPrompts.prompts.forEach(p => {
        console.log(`• ${p.name} — ${p.description}`)
    })
    console.log()
}

/**
 * /use command handler
 */
export async function handleUseCommand(cmd: string) {
    const rest = cmd.slice(5).trim()
    const spaceIdx = rest.indexOf(" ")

    const promptName = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx)
    const argString = spaceIdx === -1 ? "" : rest.slice(spaceIdx + 1)

    const promptResult = await mcpClient.getPrompt({
        name: promptName,
        arguments: parseArgs(argString),
    })

    const promptMessages = promptResult.messages.map(m => ({
        role: m.role,
        content: (m.content as any).text,
    }))

    console.log("\n📝 Prompt template use ho raha hai...\n")

    const answer = await processQuery(promptMessages)
    console.log(`🤖 AI:\n${answer}\n`)

    state.conversationHistory.push(...promptMessages)
    state.conversationHistory.push({ role: "assistant", content: answer })
}

/**
 * Normal query handler (history ke sath)
 */
export async function handleNormalQuery(cmd: string) {
    state.conversationHistory.push({ role: "user", content: cmd })

    const answer = await processQuery(state.conversationHistory)
    console.log(`\n🤖 AI:\n${answer}\n`)

    state.conversationHistory.push({ role: "assistant", content: answer })
}