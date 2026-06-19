import { HumanMessage } from "@langchain/core/messages";
import { graph } from "./src/graph.js"


async function main() {
    const app = graph.compile()
    const response = await app.invoke({
        messages: [
            new HumanMessage("Write me a linkedin Post SLM's")
        ]
    })

    console.log("Assistant Response: ",response);

}

main()