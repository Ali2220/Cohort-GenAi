import dotenv from 'dotenv';
dotenv.config();
import { Annotation, Command, MemorySaver, MessagesAnnotation, StateGraph, interrupt } from "@langchain/langgraph";
import readline from 'node:readline/promises';
import { ChatGroq } from "@langchain/groq";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// 1. Model Setup
const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    apiKey: process.env.GROQ_API_KEY!,
    temperature: 0.4,
});

// 2. State Definition
const State = Annotation.Root({
    ...MessagesAnnotation.spec,
    draft: Annotation<string>(), // Fixed syntax
    status: Annotation<string>() // Added to track final email status
});

// 3. Graph Nodes
async function draftEmail(state: typeof State.State) {
    const systemMsg = new SystemMessage(
        "You are an expert executive assistant. Draft a highly professional email based on the user's request. Provide only the Subject and Body."
    );

    const response = await model.invoke([
        systemMsg,
        ...state.messages
    ]);

    // Update state: save the draft text AND append AI's response to chat history
    return {
        draft: response.content as string,
        messages: [response]
    };
}

async function sendEmail(state: typeof State.State) {
    // Pause execution and wait for user's command
    const decision = interrupt("Please review the draft. Type 'yes' to send or 'no' to discard:");

    // Process the decision sent via Command({ resume: ... })
    const isApproved = String(decision).toLowerCase().trim() === 'yes';

    if (isApproved) {
        console.log("\n✅ Action: Email sent successfully!");
        return { status: "Sent" };
    } else {
        console.log("\n❌ Action: Email draft discarded.");
        return { status: "Discarded" };
    }
}

// 4. Graph Construction
const graph = new StateGraph(State)
    .addNode('draftEmail', draftEmail)
    .addNode('sendEmail', sendEmail)
    .addEdge('__start__', 'draftEmail')
    .addEdge('draftEmail', 'sendEmail')
    .addEdge('sendEmail', '__end__');

const app = graph.compile({ checkpointer: new MemorySaver() });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// 5. Main Execution Loop
async function main() {
    const config = { configurable: { thread_id: "email-agent-thread" } };

    console.log("🚀 Professional Email Assistant Started! (Type 'exit' to quit)\n");

    while (true) {
        const query = await rl.question("👨‍💻 You: ");

        if (query.toLowerCase() === "exit") break;

        try {
            console.log("🤖 Drafting your email... Please wait.");

            // Invoke graph with human message
            const result: any = await app.invoke(
                { messages: [new HumanMessage(query)] },
                config
            );

            // Handle the HITL interruption
            if (result.__interrupt__ && result.__interrupt__.length > 0) {
                const interruptMsg = result.__interrupt__[0]?.value;

                // Display the generated draft clearly
                console.log(`\n📄 Generated Draft:\n\n${result.draft}\n`);
                console.log(`⏸️  [SYSTEM PAUSED] ${interruptMsg}`);

                const decision = await rl.question("🤔 Your decision (yes/no): ");

                console.log("\n🤖 Processing your decision...");

                // Resume the graph
                const finalResponse = await app.invoke(
                    new Command({ resume: decision }),
                    config
                );

                console.log(`\n🏁 Final Status: ${finalResponse.status}\n`);
                console.log("--------------------------------------------------");
            }
        } catch (error: any) {
            console.error("\n🚨 Error occurred:", error.message);
        }
    }

    rl.close();
}

main();