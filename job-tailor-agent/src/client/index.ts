import dotenv from "dotenv";
dotenv.config();
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Groq } from "groq-sdk";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

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
    `;

        console.log("Resources loaded");
    } catch (err) {
        console.log("Failed to load resources");
    }
}

// get all tools from mcp-server
async function getTools() {
    const allTools = await mcpClient.listTools();

    return allTools.tools.map((tool) => ({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
        },
    }));
}

async function executeTool(toolName: string, args: any) {
    const result = await mcpClient.callTool({ name: toolName, arguments: args });

    return (result.content as any[])
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");
}

async function processQuery(initialMessages: any[]) {
    const tools = await getTools();

    const messages: any[] = [
        {
            role: "system",
            content: systemContext,
        },
        ...initialMessages,
    ];

    while (true) {
        const response = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: messages,
            tools: tools,
            tool_choice: "auto",
        });

        const message = response.choices[0]?.message;

        if (!message?.tool_calls || message?.tool_calls.length === 0) {
            return message?.content;
        }

        messages.push(message);

        for (const toolCall of message.tool_calls) {
            const toolName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            const toolResult = await executeTool(toolName, args);

            messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: toolResult,
            });
        }
    }
}

function parseArgs(argString: string): Record<string, string> {
    const args: Record<string, string> = {};
    const regex = /(\w+)=(?:"([^"]*)"|(\S+))/g;
    let match;

    while ((match = regex.exec(argString))) {
        // match[2] = quoted value, match[3] = unquoted value
        args[match[1]] = match[2] ?? match[3];
    }

    return args;
}

async function chatLoop() {
    const rl = readline.createInterface({ input, output });

    console.log("🤖 Job Tailor Agent ready!");
    console.log("Commands:");
    console.log("  /prompts                → available prompts dekhein");
    console.log("  /use <name> key=value   → prompt template use karein");
    console.log("  exit                    → band karein\n");

    try {
        while (true) {
            const cmd = (await rl.question("You: ")).trim();

            if (cmd === "exit") {
                break;
            }

            try {
                if (cmd === "/prompts") {
                    const allPrompts = await mcpClient.listPrompts();
                    console.log("\n📝 Available prompts:");
                    allPrompts.prompts.forEach((p) => {
                        console.log(`• ${p.name} — ${p.description}`);
                    });
                    console.log()
                    continue
                }

                if (cmd.startsWith("/use")) {
                    // rest contains the name of the prompt (tailor_resume OR write_cover_letter)
                    const rest = cmd.slice(5).trim()
                    const spaceIdx = rest.indexOf(" ")

                    const promptName = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx)
                    const argString = spaceIdx === -1 ? "" : rest.slice(spaceIdx + 1)

                    const args = parseArgs(argString)

                    const promptResult = await mcpClient.getPrompt({
                        name: promptName,
                        arguments: args
                    })

                    const promptMessages = promptResult.messages.map(m => ({
                        role: m.role,
                        content: (m.content as any).text
                    }))

                    const answer = await processQuery(promptMessages)
                    console.log(`🤖 AI:\n${answer}\n`);

                    conversationHistory.push(...promptMessages)
                    conversationHistory.push({ role: "assistant", content: answer })
                }

                const userMessage = { role: 'user', content: cmd }

                conversationHistory.push(userMessage)

                const answer = await processQuery(conversationHistory)
                console.log(`\n🤖 AI:\n${answer}\n`);

                conversationHistory.push({ role: "assistant", content: answer })

            } catch (err) {
                console.error(`❌ Error: ${err}`)
            }
        }
    } finally {
        rl.close()
    }
}

async function main() {
    const serverPath = process.argv[2] || "dist/server/index.js"

    try {
        await connectToServer(serverPath)
        await loadContext()
        await chatLoop()
    } finally {
        mcpClient.close()
        console.log("Bye");

    }
}

main().catch(console.error)