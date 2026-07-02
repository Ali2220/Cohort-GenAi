import { graph } from "./src/graph.ts"

async function main(){
    const app = graph.compile()

    const result = await app.invoke({
        messages: [
            {
                role: "human",
                content: "Create a meeting tommorrow with Ali at 3pm in gulshan, and send the him the email. His email (ali.g21054@iqra.edu.pk)" 
            }
        ]
    })

    console.log("=".repeat(12))
    console.log("📤Result: ", result.messages[result.messages.length - 1]?.content)
    console.log("=".repeat(12))
}

main()