import dotenv from 'dotenv'
dotenv.config()
import { Annotation, Command, MemorySaver, MessagesAnnotation, StateGraph, interrupt } from "@langchain/langgraph";
import readline from 'node:readline/promises'
import {ChatGroq} from "@langchain/groq"

const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    apiKey: process.env.GROQ_API_KEY!,
    temperature: 0.4,
})

const State = Annotation.Root({
    ...MessagesAnnotation.spec,
    draft: Annotation<string>
})

// node
async function draftEmail(state: typeof State.State) {
    console.log("draft is ready");

    return {
        draft: 'This is the first draft'
    }
}


// node
async function sendEmail(state: typeof State.State) {
    console.log("Sending email");

    const approved = interrupt("Do you approve this action?")
    console.log("Approved: ", approved);
    return state
}

const graph = new StateGraph(State)
    .addNode('draftEmail', draftEmail)
    .addNode('sendEmail', sendEmail)

    .addEdge('__start__', 'draftEmail')
    .addEdge('draftEmail', 'sendEmail')
    .addEdge('sendEmail', '__end__')

const app = graph.compile({ checkpointer: new MemorySaver() })

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })


async function main() {

    while (true) {
        const query = await rl.question("You: ")

        if (query.toLowerCase() === "exit") {
            break
        }

        const result = await app.invoke(
            {
                messages: [
                    {
                        role: 'human',
                        content: query
                    }
                ]
            },
            {
                configurable: { thread_id: "user-123" }
            }
        )

        type StateWithInteruupt = typeof State.State & { __interrupt__: { id: string, value: string }[] }

        const _result = (result as StateWithInteruupt).__interrupt__

        if (_result) {
            // take users input, and then reinvoke graph
            console.log(_result[0]?.value);

            const decision = await rl.question("Tell us whether you want to send an email or not?: ")

            const finalResponse = await app.invoke(
                new Command({ resume: decision }), { configurable: { thread_id: "user-123" } }
            )

            console.log("Final Response: ", finalResponse);

        }

        console.log("Result: ", JSON.stringify(result, null, 2));
    }

    rl.close()

}

main()