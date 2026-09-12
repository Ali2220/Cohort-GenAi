import dotenv from "dotenv"
dotenv.config()
import { Groq } from "groq-sdk"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import * as readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

const GROQ_API_KEY = process.env.GROQ_API_KEY

if (!GROQ_API_KEY) {
    throw new Error("Groq api key not found!")
}

const groq = new Groq({
    apiKey: GROQ_API_KEY,
})

const mcpClient = new Client({
    name: "my-mcp-client",    // Client ka naam (server ko batane ke liye)
    version: "1.0.0"          // Client ka version
})

/**
 * Ye function MCP server ko start karta hai aur us se connect hota hai
 * @param serverPath - Compiled server file ka path (e.g., "dist/index.js")
 */
async function connectToServer(serverPath: string) {
    // Transport banayein - ye batata hai ke server kaise start karna hai
    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath]
    })

    // MCP client ko transport ke zariye server se connect karein
    await mcpClient.connect(transport)
    console.log("Mcp Server or Mcp Client ke darmain connection ho gya.");
}

/**
 * MCP server se saare tools ki list leti hai aur unhe Groq format mein convert karti hai
 * 
 * MCP Format: { name, description, inputSchema }
 * Groq Format: { type: "function", function: { name, description, parameters } }
 * 
 * Ye conversion zaroori hai kyunke Groq ko specific format chahiye
 */
async function getTools() {
    // MCP server se tools ki list lein
    const allTools = await mcpClient.listTools()

    // Har tool ko Groq ke format mein convert karein
    return allTools.tools.map(tool => ({
        type: "function",  // Groq ko ye batana zaroori hai ke ye function hai
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema
        }
    }))
}

/**
 * MCP server par kisi specific tool ko execute karta hai
 * @param toolName - Tool ka naam jo call karna hai
 * @param args - Tool ke arguments (JSON object)
 * @returns Tool ka output (text format mein)
 */
async function executeTool(toolName: string, args: any) {
    const result = await mcpClient.callTool({
        name: toolName,
        arguments: args
    })

    // Result se sirf text content extract karein
    // MCP response mein multiple content blocks ho sakte hain (text, image, etc.)
    const toolOutput = (result.content as any[])
        .filter(block => block.type === "text")  // Sirf text blocks filter karein
        .map(block => block.text)                 // Text extract karein
        .join('\n')

    return toolOutput
}

/**
 * Ye sab se important function hai - Claude Desktop jaisa agentic loop
 * 
 * Flow:
 * 1. User query Groq ko bhejo (with available tools)
 * 2. Groq decide karega: tool chahiye ya nahi?
 * 3. Agar tool chahiye → tool execute karo → result Groq ko wapas bhejo
 * 4. Groq final answer de dega
 * 
 * Ye loop tab tak chalega jab tak Groq final answer na de
 */
async function processQuery(userQuery: string) {
    // Saare available tools lein (Groq format mein)
    const tools = await getTools()

    // Conversation history (messages array) - Groq ko yaad dilane ke liye
    const messages: any[] = [
        {
            role: 'user',
            content: userQuery
        }
    ]

    // AGENTIC LOOP - Ye tab tak chalega jab tak final answer na mile
    while (true) {
        // Groq ko messages + tools bhejein
        const response = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: messages,             // Conversation history
            tools: tools,                   // Available tools
            tool_choice: "auto"            // Groq khud decide kare ke tool use karna hai ya nahi
        })

        // Groq ka response message nikalein
        const message = response.choices[0]?.message

        // CHECK: Kya Groq ne tool call kiya?
        // Agar tool_calls nahi hain, to final answer mil gaya - return karein
        if (!message?.tool_calls || message.tool_calls.length === 0) {
            return message?.content || ""
        }

        // Agar tool call kiya hai, to assistant message ko history mein add karein
        messages.push(message)

        // Har tool call ko execute karein
        for (const toolCall of message.tool_calls) {
            // Tool ka naam aur arguments nikalein
            const toolName = toolCall.function.name
            const args = JSON.parse(toolCall.function.arguments)

            // MCP server par tool execute karein
            const toolResult = await executeTool(toolName, args)

            messages.push({
                role: "tool",                    // Ye tool ka response hai
                content: toolResult,             // Tool ka output
                tool_call_id: toolCall.id        // Konsa tool call tha ye ID se match hota hai
            })
        }
    }
}

/**
 * Terminal mein user se input leta hai aur AI ke answers dikhata hai
 * Ye function tab tak chalta hai jab tak user "exit" na bole
 */
async function chatLoop() {
    // Readline interface banayein - terminal input/output ke liye
    const rl = readline.createInterface({ input, output })

    try {
        // Infinite loop - jab tak user exit na kare
        while (true) {
            // User se input lein
            const userInput = await rl.question("You: ")

            // Agar user ne "exit" likha to loop break karein
            if (userInput.toLowerCase().includes("exit")) {
                break
            }

            try {
                // User query ko process karein (agentic loop chalega)
                const answer = await processQuery(userInput)
                console.log(`Ai Answer: ${answer}`);

            } catch (err) {
                // Agar koi error aaye to user ko dikhayein
                console.log(`Error: ${err}`)
            }
        }
    } finally {
        // Readline interface band karein (cleanup)
        rl.close()
    }
}

/**
 * Program ka entry point - sab se pehle ye chalta hai
 */
async function main() {
    // Command line argument se server path lein
    // Agar nahi diya to default: "dist/index.js"
    const serverPath = process.argv[2] || "dist/index.js"

    try {
        // Pehle server se connect karein
        await connectToServer(serverPath)

        // Phir chat loop start karein
        await chatLoop()
    } finally {
        // Hamesha cleanup karein - MCP connection band karein
        await mcpClient.close()
        console.log("\n👋Bye");
    }
}

main().catch(console.error)