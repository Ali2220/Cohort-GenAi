// ENTRY POINT - Chat loop + main
import * as readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { mcpClient } from "./config.js"
import { connectToServer, loadContext } from "./mcp.js"
import {
    handlePromptsCommand,
    handleUseCommand,
    handleNormalQuery,
} from "./agent.js"

/**
 * User interface - input lena aur commands route karna
 */
async function chatLoop() {
    const rl = readline.createInterface({ input, output })

    console.log("🤖 Job Tailor Agent ready!")
    console.log("Commands:")
    console.log("  /prompts                → available prompts dekhein")
    console.log("  /use <name> key=value   → prompt template use karein")
    console.log("  exit                    → band karein\n")

    try {
        while (true) {
            const cmd = (await rl.question("You: ")).trim()

            if (cmd.toLowerCase() === "exit") break

            try {
                if (cmd === "/prompts") {
                    await handlePromptsCommand()
                    continue // normal query skip
                }

                if (cmd.startsWith("/use ")) {
                    await handleUseCommand(cmd)
                    continue // normal query skip (bug fix!)
                }

                await handleNormalQuery(cmd)
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
        await mcpClient.close()
        console.log("Bye")
    }
}

main().catch(console.error)