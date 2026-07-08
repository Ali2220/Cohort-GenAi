import { MemorySaver, Command } from '@langchain/langgraph';
import { graph } from './graph.ts'
import readLine from 'node:readline/promises'

// MemorySaver state ko yaad rakhta hai. HITL interrupt ke liye state save karna zaroori hota hai.
const checkpointer = new MemorySaver()

async function main() {
    // Checkpointer ke sath graph ko compile kiya
    const app = graph.compile({ checkpointer: checkpointer })

    // Terminal input/output setup kiya
    const rl = readLine.createInterface({ input: process.stdin, output: process.stdout })

    // Thread ID graph ko batata hai ke ye ek hi conversation/session chal raha hai
    const config = { configurable: { thread_id: 'user-123' } }

    // Step 1: User se unki requirement pucho
    const input = await rl.question('\n📝 Where do you want to go? (e.g., "Kashmir for 3 days"): ');

    // Agar user exit likhe toh program band kardo
    if (input.toLowerCase() === "exit") {
        rl.close();
        return;
    }

    // Step 2: Pehli dafa graph start karo user input ke sath
    console.log("\n🤖 Planning your trip... Please wait...");
    let result = await app.invoke({
        messages: [{ role: 'human', content: input }]
    }, config);

    // Step 3: Check karo ke graph interrupt hua hai ya nahi
    // result.__interrupt__ array tab banti hai jab graph kisi interrupt() call (hitlNode) par rukta hai
    if (result.__interrupt__ && result.__interrupt__.length > 0) {

        // Jo itinerary state mein save hui thi wo print karwai
        console.log(`\n📋 Generated Itinerary:\n\n${result.itinerary}`);

        // Human-in-the-loop: User se pucho plan kaisa laga
        const decision = await rl.question('\n🤔 Do you want to book this trip? (yes/no): ');

        // Step 4: Graph jahan ruka tha, wahan se 'resume' karo Command class ke zariye
        console.log("\n🤖 Processing your decision...");
        const finalResult = await app.invoke(new Command({ resume: decision }), config);

        // Jab graph action node cross karke end hoga, toh messages array mein aakhri message final result hoga
        const finalMsg = finalResult.messages[finalResult.messages.length - 1];
        console.log(`\n🤖 Bot Response: ${finalMsg.content}\n`);

    } else {
        // Agar bina kisi interrupt ke graph end ho jaye (jo is logic mein nahi hona chahiye par safety ke liye)
        console.log("\n📋 Result:", result.itinerary);
    }

    // Input line close kardi taake program properly exit ho
    rl.close()
}

main()