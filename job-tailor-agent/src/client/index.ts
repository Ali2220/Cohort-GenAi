import dotenv from "dotenv";
dotenv.config();
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Groq } from "groq-sdk";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
    throw new Error("Groq Api key not found");
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const mcpClient = new Client({
    name: "job-tailor-client",
    version: "1.0.0",
});

// systemContext = startup par resources load honge (resume + contact)
let systemContext = "";

// conversationHistory = persistent messages (user queries + AI answers + tool calls)
// Shape: [{ role: "user", content: "..." }, { role: "assistant", content: "..." }, ...]
let conversationHistory: any[] = [];

async function connectToServer(serverPath: string) {
    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
    });
    await mcpClient.connect(transport);

    console.log("Mcp-client connected to Mcp-server");
}

// read all resources from mcp-server
async function loadContext() {
    try {
        const resume = await mcpClient.readResource({ uri: "resume://master" });
        const contact = await mcpClient.readResource({ uri: "profile://contact" });

        const resumeText = (resume.contents as any[]).map((c) => c.text).join("\n");
        const contactText = (contact.contents as any[])
            .map((c) => c.text)
            .join("\n");

        systemContext = `
        You are a job application assistant. The user's master resume and contact info are below. Use them whenever tailoring resumes or writing cover letters.

    === MASTER RESUME ===
    ${resumeText}

    === CONTACT INFO ===
    ${contactText}
    `

        console.log("Resources loaded");

    } catch (err) {
        console.log("Failed to load resources");
    }
}

// get all tools from mcp-server
async function getTools() {
    const allTools = await mcpClient.listTools()

    return allTools.tools.map(tool => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema
        }
    }))
}

async function executeTool(toolName: string, args: any) {
    const result = await mcpClient.callTool({ name: toolName, arguments: args })

    return (result.content as any[])
        .filter(block => block.type === "text")
        .map(block => block.text)
        .join('\n')
}

async function processQuery(initialMessages: any[]) {

    const tools = await getTools()

    const messages: any[] = [
        {
            role: "system",
            content: systemContext
        },
        ...initialMessages
    ]

    while (true) {
        const response = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: messages,
            tools: tools,
            tool_choice: "auto"
        })

        const message = response.choices[0]?.message

        if (!message?.tool_calls || message?.tool_calls.length === 0) {
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
                content: toolResult
            })
        }
    }
}