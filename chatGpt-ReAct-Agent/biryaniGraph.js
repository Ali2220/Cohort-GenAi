import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph"
import fs from 'node:fs/promises'

// 1. ALL NODES (Worker Functions)
// Har function 'state' leta hai aur 'state' hi return karta hai
function cutVegetables(state) {
    console.log('Step 1: Cutting the vegetables...');
    return state; // State mein koi tabdeeli nahi ki, bas aage bhej diya
}

function boilRice(state) {
    console.log('Step 2: Boiling the rice...');
    return state;
}

function addSalt(state) {
    console.log("Step 3: Adding the salt...");
    return state;
}

function testBiryani(state) {
    console.log("Step 4: Tasting the biryani to check salt...");
    return state;
}

// 2. DECISION LOGIC (The Brain)
// Ye node tay karta hai ke agla rasta konsa hoga
function decisionNode(state) {
    // Agar namak sahi hai (true), to khatam karo
    if (true) {
        return "__end__";
    }
    // Warna wapis namak dalne wale step par jao
    return "addSalt";
}

// 3. GRAPH CONSTRUCTION (Drawing the Map)
// MessagesAnnotation use kar rahe hain jo chat history handle karta hai
const graph = new StateGraph(MessagesAnnotation)
    // Nodes ko graph mein register karna
    .addNode("cutVegetables", cutVegetables)
    .addNode("boilRice", boilRice)
    .addNode("addSalt", addSalt)
    .addNode("testBiryani", testBiryani)

    // Edges: Ek step se dusre step ka rasta
    .addEdge(START, "cutVegetables")       // Shuruat yahan se
    .addEdge("cutVegetables", "boilRice")  // Sabzi ke baad chawal
    .addEdge("boilRice", "addSalt")        // Chawal ke baad namak
    .addEdge("addSalt", "testBiryani")     // Namak ke baad tasting

    // Conditional Edge: Tasting ke baad faisla
    .addConditionalEdges(
        "testBiryani", // Kahan se faisla shuru hoga
        decisionNode,  // Konsa function faisla karega
        {
            "__end__": END,       // Agar function ne "__end__" kaha to STOP
            "addSalt": "addSalt"  // Agar "addSalt" kaha to wapis namak wale node par jao (LOOP)
        }
    );

// 4. COMPILATION & EXECUTION
// Graph ko tayyar (compile) karna
const biryaniProcess = graph.compile();

async function main() {
    // Visualization Part
    // Graph ka visual map (Image) banane ke liye
    const drawableGraph = await biryaniProcess.getGraphAsync();
    const image = await drawableGraph.drawMermaidPng();
    const imageBuffer = new Uint8Array(await image.arrayBuffer());
    await fs.writeFile("biryani.png", imageBuffer);
    console.log("Success: Graph visualization saved as biryani.png");

    // Invocation Part
    // Biryani pakana shuru karte hain!
    const finalState = await biryaniProcess.invoke({
        messages: [] // Shuru mein koi messages nahi hain
    });

    console.log("Final State of Process:", finalState);
}

main();