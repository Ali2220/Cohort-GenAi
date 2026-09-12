import dotenv from "dotenv";
dotenv.config();
import { Groq } from "groq-sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
    throw new Error("Groq api key not found!");
}
const groq = new Groq({
    apiKey: GROQ_API_KEY,
});
const mcpClient = new Client({
    name: "my-mcp-client",
    version: "1.0.0"
});
async function connectToServer(serverPath) {
    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath]
    });
    await mcpClient.connect(transport);
    console.log("Mcp Server or Mcp Client ke darmian connection ho gya.");
}
async function getTools() {
    const allTools = await mcpClient.listTools();
    return allTools.tools.map(tool => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema
        }
    }));
}
async function executeTool(toolName, args) {
    const result = await mcpClient.callTool({
        name: toolName,
        arguments: args
    });
    const toolOutput = result.content
        .filter(block => block.type === "text")
        .map(block => block.text)
        .join('\n');
    return toolOutput;
}
async function processQuery(userQuery) {
    const tools = await getTools();
    const messages = [
        {
            role: 'user',
            content: userQuery
        }
    ];
    while (true) {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: messages,
            tools: tools,
            tool_choice: "auto"
        });
        const message = response.choices[0]?.message;
        if (!message?.tool_calls || message.tool_calls.length === 0) {
            return message?.content || "";
        }
        messages.push(message);
        for (const toolCall of message.tool_calls) {
            const toolName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            const toolResult = await executeTool(toolName, args);
            messages.push({
                role: "tool",
                content: toolResult
            });
        }
    }
}
async function chatLoop() {
    const rl = readline.createInterface({ input, output });
    try {
        while (true) {
            const userInput = await rl.question("You: ");
            if (userInput.toLowerCase().includes("exit")) {
                break;
            }
            try {
                const answer = await processQuery(userInput);
                console.log(`Ai Answer: ${answer}`);
            }
            catch (err) {
                console.log(`Error: ${err}`);
            }
        }
    }
    finally {
        rl.close();
    }
}
async function main() {
    const serverPath = process.argv[2] || "dist/index.js";
    try {
        await connectToServer(serverPath);
        await chatLoop();
    }
    finally {
        await mcpClient.close();
        console.log("\n👋Bye");
    }
}
main().catch(console.error);
//# sourceMappingURL=mcp-client.js.map