import { HumanMessage } from "@langchain/core/messages";
import { graph } from "./src/graph.js"
import fs from 'node:fs/promises'

async function main() {
    const app = graph.compile()

    const response = await app.invoke({
        messages: [
            new HumanMessage("Write me a LinkedIn post about SLMs (Small Language Models)")
        ]
    })

    // Extract the Final Answer
    // Kyunke state.messages mein user prompts, Reflector ki critiques, aur Generator ke drafts sab mix hote hain,
    // Hum filter laga kar sirf Generator (AI) ke banaye hue messages nikalte hain.
    const aiMessages = response.messages.filter((m) => m.getType() === "ai")

    // Un AI messages mein se jo sab se aakhri (last) message hai, wahi hamara successfully passed final draft hoga.
    const finalPost = aiMessages[aiMessages.length - 1]?.content

    console.log("==========================================");
    console.log("✨ YOUR FINAL LINKEDIN POST:");
    console.log("==========================================\n");
    console.log(finalPost);
    console.log("\n==========================================");

    // post ko file mai save kra rhe hain.
    await fs.writeFile('post.md', finalPost as string, 'utf8')
}

// Run the script
main()