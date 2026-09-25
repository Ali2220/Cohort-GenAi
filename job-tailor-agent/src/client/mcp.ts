// MCP - Server connection + resources + tools
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { mcpClient, state } from "./config.js"

/**
 * Server se connect karta hai
 */
export async function connectToServer(serverPath: string) {
    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
    })

    await mcpClient.connect(transport)
    console.log("Mcp-client connected to Mcp-server")
}

/**
 * Resources parh kar system context mein load karta hai
 */
export async function loadContext() {
    try {
        const resume = await mcpClient.readResource({ uri: "resume://master" })
        const contact = await mcpClient.readResource({ uri: "profile://contact" })

        const resumeText = (resume.contents as any[]).map(c => c.text).join("\n")
        const contactText = (contact.contents as any[]).map(c => c.text).join("\n")

        state.systemContext = `You are a job application assistant. The user's master resume and contact info are below. Use them whenever tailoring resumes or writing cover letters.

=== MASTER RESUME ===
${resumeText}

=== CONTACT INFO ===
${contactText}`

        console.log("Resources loaded")
    } catch (err) {
        console.log("Failed to load resources")
    }
}

/**
 * Tools ki list le kar Groq format mein convert karta hai
 */
export async function getTools() {
    const allTools = await mcpClient.listTools()

    return allTools.tools.map(tool => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
        },
    }))
}

/**
 * Server par tool execute karta hai
 */
export async function executeTool(toolName: string, args: any) {
    console.log(`🛠️  [tool call] ${toolName}`)

    const result = await mcpClient.callTool({ name: toolName, arguments: args })

    return (result.content as any[])
        .filter(block => block.type === "text")
        .map(block => block.text)
        .join("\n")
}