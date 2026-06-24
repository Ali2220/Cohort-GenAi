import { workflow } from "./src/graph.ts"

async function main() {
    const app = workflow.compile()

    const response = await app.invoke({
        messages: [
            {
                role: 'human',
                content: "what is the future of generative-Ai ?"
            }
        ]
    })

    const lastMessage = response.messages[response.messages.length - 1]?.content

    console.log("-------------");
    console.log("Final Response: ", JSON.parse(lastMessage as string).answer);
    console.log("-------------");

}

main()