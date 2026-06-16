import { StateGraph, MemorySaver } from "@langchain/langgraph";
import { StateAnnotation } from "./state.js";
import { model } from "./model.js";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { getOffers, retrieve_data } from "./tools.js";
import { RemoveMessage, type AIMessage } from "@langchain/core/messages";
import readLine from "node:readline/promises";
import { pathToFileURL } from "node:url";

// ==========================================
// 🧠 MEMORY & TOOLS CONFIGURATION
// ==========================================

// MemorySaver instance chat history aur threads (sessions) ko save rakhne ke liye use hota hai
const checkpointer = new MemorySaver();

// Marketing Team ke tools define kiye aur unhe LangGraph ke prebuilt ToolNode mein register kiya
const marketingTools = [getOffers, retrieve_data];
const marketingToolNode = new ToolNode(marketingTools);

// Learning Team ke paas sirf vector database (Pinecone) se data read karne ka tool hai
const learningTools = [retrieve_data];
const learningToolNode = new ToolNode(learningTools);

// ==========================================
// 🛎️ NODE 1: FRONT DESK SUPPORT
// ==========================================
async function frontDeskSupport(state: typeof StateAnnotation.State) {
  console.log("🛎️ Front Desk Support Node Triggered!");

  // System Prompt jo model ko batata hai ke uski basic aur core guidelines kya hain
  // Agar state mein pehle se bani koi 'summary' mojud hai, toh use yahan inject kar diya jata hai
  const SYSTEM_PROMPT = `You are a frontline support staff for Systems Limited... [Your existing description].

    ${state.summary ? `\n🧠 PREVIOUS CHAT SUMMARY: ${state.summary}` : ""}
    
Guidelines:
- Be concise and professional in your responses.
- If the student has a MARKETING query... (Transfer to Marketing)
- If the student has a LEARNING support query... (Transfer to Learning)`;

  // First LLM Call: User ko basic ya welcoming reply dene ke liye
  const supportResponse = await model.invoke([
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    ...state.messages, // Puraane saare chat messages history ke taur par pass kiye
  ]);

  // Router Agent (Backend Classifier) ka system prompt jo customer ki category nikalta hai
  const CATEGORIZATION_SYSTEM_PROMPT = `You are an expert customer support routing system.
    Your job is to detect whether a customer support representative is routing a user to a marketing team or learning support team, or if they are just responding conversationally.`;

  // Router ko JSON pattern enforce karne ke liye strict instructions
  const CATEGORIZATION_HUMAN_PROMPT = `The previous conversation is an interaction between a customer support representative and a user. Extract, whether the representative is routing the user to a marketing team or learning support team, or whether they are just responding occasionally.
    Responding with a JSON object containing a single key called "nextRepresentative" with one of the following values:

    If they want to route the user to the marketing team, respond with "MARKETING".
    If they want to route the user to the learning support team, respond with "LEARNING".
    Otherwise, respond only with the word "RESPOND"`;

  // Second LLM Call: Yeh call user ko dikhane ke liye nahi hai, yeh sirf system routing ka faisla karti hai
  const categorizationResponse = await model.invoke(
    [
      {
        role: "system",
        content: CATEGORIZATION_SYSTEM_PROMPT,
      },
      ...state.messages,
      supportResponse, // Front Desk ka abhi ka taza reply bhi pass kiya taake context breakdown na ho
      {
        role: "human",
        content: CATEGORIZATION_HUMAN_PROMPT,
      },
    ],
    {
      response_format: {
        type: "json_object", // Model ko bound kiya ke output strictly valid JSON format mein ho
      },
    },
  );

  // String output ko valid JavaScript object mein parse kar liya
  const categorizationOutput = JSON.parse(
    categorizationResponse.content as string,
  );

  // State return: Front Desk ka reply array mein append hoga aur next representative update ho jayega
  return {
    messages: [supportResponse],
    nextRepresentative: categorizationOutput.nextRepresentative,
  };
}

// ==========================================
// 🚀 NODE 2: MARKETING SUPPORT (WITH TOOLS)
// ==========================================
async function marketingSupport(state: typeof StateAnnotation.State) {
  console.log("🚀 Marketing Team Support Node Activated!");

  // LLM ke sath marketing tools bind kiye taake woh function/tool calling execute kar sake
  const llmWithTools = model.bindTools(marketingTools);

  const systemPrompt = `You are an enthusiastic Marketing Support Specialist for Systems Limited (Web Dev & Gen AI courses). Your job is to assist students with fees, discounts, promos, and installments.

Rules:
- TOOL USAGE LIMIT: Always use tools to fetch live data.
- 🛑 CRITICAL VERIFICATION: If a user asks for a discount on a SPECIFIC course (like "Rust", "Python", "React"), you MUST FIRST call the 'retrieve_data' tool to check if we actually offer that course.
- NO HALLUCINATION: If 'retrieve_data' returns that the course is not found, DO NOT offer them a discount. Politely inform them that we currently do not offer that specific course.
- If the course is verified to exist, call 'getOffers' to get the promo codes and provide them enthusiastically.
- Tone & Style: Be persuasive, energetic, and natural. Never mention tools, databases, or background searches to the user; just deliver the facts smoothly.

This is the summary of [0, -2] messages:
${state.summary ? `\n🧠 PREVIOUS CHAT SUMMARY: ${state.summary}` : ""}
`;

  // ⚠️ HISTORY TRIMMING LOGIC:
  // Agar pichla message AI ka transfer statement hai ("Please hold..."), toh hum use history se slice kar dete hain
  // taake Marketing agent seedha user ke direct question par focus kare aur break ya loop na ho.
  let trimmedHistory = state.messages;

  if (trimmedHistory.at(-1)?.getType() === "ai") {
    trimmedHistory = trimmedHistory.slice(0, -1);
  }

  // Marketing LLM call trigger ki (Yeh ya toh Tool call karega ya direct message return karega)
  const marketingResponse = await llmWithTools.invoke([
    {
      role: "system",
      content: systemPrompt,
    },
    ...trimmedHistory,
  ]);

  return {
    messages: [marketingResponse],
  };
}

// ==========================================
// 🧠 NODE 3: LEARNING SUPPORT
// ==========================================
async function learningSupport(state: typeof StateAnnotation.State) {
  console.log("🧠 Learning Team Support Node Activated!");

  const SYSTEM_PROMPT = `You are an expert Learning Support Assistant for Systems Limited. Your primary goal is to help users with course-related queries based ONLY on verified data returned by tools.

To fulfill your role, you have access to the 'retrieve_data' tool. Follow these strict operational guidelines:

1. TOOL USAGE LIMIT: If the user's query requires external knowledge or course details, call the 'retrieve_data' tool.
2. 🛑 STRICT RELEVANCY & KEYWORD CHECK:
   - When a user asks about a specific course, topic, or language (e.g., "Rust", "Python"), you MUST check if that exact keyword/language name exists in the text returned by 'retrieve_data'.
   - CRITICAL: If the tool output describes a course but DOES NOT explicitly mention the requested language ("Rust"), do NOT assume it is relevant. Do NOT map your internal knowledge to the modules mentioned in the tool. Treat it as IRRELEVANT.
3. RETRIES:
   - If the data returned is not relevant or doesn't mention the requested topic, you may refine your queryText (e.g., search just the keyword "Rust") and try again.
   - MAXIMUM LIMIT: You can call 'retrieve_data' a MAXIMUM OF 3 TIMES.
4. FALLBACK (NO HALLUCINATION):
   - If after 3 attempts you cannot find text that explicitly mentions the requested course, DO NOT invent a syllabus, modules, or details.
   - Politely inform the user that Systems Limited currently does not offer that specific course, and list the actual courses visible in the context if any (like Web Development or Generative AI).

Tone: Keep your responses highly encouraging, clear, educational, and strictly honest based on provided data.

     This is the summary of [0, -2] messages:
     ${state.summary ? `\n🧠 PREVIOUS CHAT SUMMARY: ${state.summary}` : ""}
`;

  // Same trimming logic: Transfer messages ko check karke temporary slice lagana
  let trimmedHistory = state.messages;

  if (trimmedHistory.at(-1)?.getType() === "ai") {
    trimmedHistory = trimmedHistory.slice(0, -1);
  }

  const llmWithTools = model.bindTools(learningTools);

  const learningResponse = await llmWithTools.invoke([
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    ...trimmedHistory,
  ]);

  return {
    messages: [learningResponse],
  };
}

// ==========================================
// 📝 NODE 4: SUMMARIZE CONVERSATION
// ==========================================
async function summarizeConversation(state: typeof StateAnnotation.State) {
  console.log("⚙️ Summarization Node Triggered!");
  const currentSummary = state.summary || "";
  const messages = state.messages;

  // LLM Prompt jo purani summary aur chal rahe naye messages ko mila kar compressed statement banata hai
  const summarizePrompt = `You are a helpful assistant tasked with summarizing a conversation between a customer support agent and a user.
    ${currentSummary ? `Here is the previous summary of the chat so far: ${currentSummary}` : ""}
    
    Combine the previous summary with the new messages provided below. Keep the summary concise but retain all important details like the user's intent, specific courses asked about, and any decisions made.`;

  const summarizeResponse = await model.invoke([
    {
      role: "system",
      content: summarizePrompt,
    },
    ...messages,
  ]);

  // 🧹 GRAPH MEMORY CLEANING (CRITICAL STEP):
  // Rolling Window Mechanism: Shuru se lekar aakhri 2 messages ko chhor kar, baaki saare messages array se nikal diye
  // taake LLM ke token / context window overload na hon aur performance fast rahe.
  const deleteMessages = messages
    .slice(0, -2) // Aakhri do messages safe zone mein hain
    .filter((m) => m.id) // Sirf un messages ko map kiya jinki validity unique ID se clear hai
    .map((m) => new RemoveMessage({ id: m.id as string })); // LangGraph state reducer ko clear signal bheja deleting ka

  return {
    summary: summarizeResponse.content,
    messages: deleteMessages, // State mein purane saare messages delete ho jayenge aur nayi summary save ho jayegi
  };
}

// ==========================================
// 🔀 CONDITIONAL ROUTING FUNCTIONS
// ==========================================

/**
 * Front Desk Node execution ke baad check karta hai ke next agent kaunsa hoga.
 * Agar router response RESPOND hai aur array 10 messages cross kar chuka hai, toh yeh summary node par redirect karega.
 */
function routingFunction(state: typeof StateAnnotation.State) {
  if (state.nextRepresentative.includes("MARKETING")) {
    return "marketingSupport";
  } else if (state.nextRepresentative.includes("LEARNING")) {
    return "learningSupport";
  } else {
    // Rolling window check: Agar total messages ki length 10 se barh gayi toh pehle summary banegi
    return state.messages.length > 10 ? "summarizeConversation" : "__end__";
  }
}

/**
 * Check karta hai ke kya Marketing Agent ne tool access kiya hai ya direct simple statement pass kiya hai.
 */
function isMarketingToolNext(state: typeof StateAnnotation.State) {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  // Agar last message mein model ne 'tool_calls' array return kiya hai, toh flow ToolNode par jayega
  if (lastMessage.tool_calls?.length) {
    console.log("🎯 Model wants to call a tool. Redirecting to ToolNode!");
    return "marketingTools";
  } else {
    console.log(
      "💬 Model generated a final text response. Checking for summarization window!",
    );
    // Agar tool call nahi hai aur messages length limits ko hit karti hain toh loop summary node par bhejega
    return state.messages.length > 10 ? "summarizeConversation" : "__end__";
  }
}

/**
 * Check karta hai ke kya Learning Support Agent ko external data/Pinecone verification ki zaroorat hai?
 */
function isLearningToolNext(state: typeof StateAnnotation.State) {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls?.length) {
    return "learningTools"; // Tool execution node ki taraf verification point route kiya
  } else {
    return state.messages.length > 10 ? "summarizeConversation" : "__end__";
  }
}

// ==========================================
// 🏗️ GRAPH ARCHITECTURE & COMPILATION
// ==========================================

const graph = new StateGraph(StateAnnotation)
  // Saare logic nodes graph map ke sath register kiye
  .addNode("frontDeskSupport", frontDeskSupport)
  .addNode("marketingSupport", marketingSupport)
  .addNode("learningSupport", learningSupport)
  .addNode("marketingTools", marketingToolNode)
  .addNode("learningTools", learningToolNode)
  .addNode("summarizeConversation", summarizeConversation)

  // Entry Point Config: Entry point hamesha Front Desk Support hoga
  .addEdge("__start__", "frontDeskSupport")

  // Front Desk Evaluation Path Settings (Router determines destination)
  .addConditionalEdges("frontDeskSupport", routingFunction, {
    marketingSupport: "marketingSupport",
    learningSupport: "learningSupport",
    summarizeConversation: "summarizeConversation",
    __end__: "__end__",
  })

  // Marketing Team execution limits and data checkpoints
  .addConditionalEdges("marketingSupport", isMarketingToolNext, {
    marketingTools: "marketingTools",
    summarizeConversation: "summarizeConversation",
    __end__: "__end__",
  })

  // Learning Team data verification pipelines
  .addConditionalEdges("learningSupport", isLearningToolNext, {
    learningTools: "learningTools",
    summarizeConversation: "summarizeConversation",
    __end__: "__end__",
  })

  // Cyclic Loops Management: Tool processing ke baad flow wapas execution nodes par loop back karega
  .addEdge("learningTools", "learningSupport")
  .addEdge("marketingTools", "marketingSupport");

// State checkpoint logic pass karke graph runtime app compile kiye
export const app = graph.compile({ checkpointer });

// ==========================================
// 🌐 API / FRONTEND EXPORTABLE FUNCTION
// ==========================================

/**
 * `askAgent` wrapper standard string queries handle karta hai.
 * Yeh function Express API controllers ya kisi bhi system endpoint se direct call kiya ja sakta hai.
 */
export async function askAgent(question: string, threadId = "1") {
  const result = await app.invoke(
    {
      messages: [
        {
          role: "human",
          content: question,
        },
      ],
    },
    {
      // Thread Id har alag customer screen session ko system background pe tracker provide karti hai
      configurable: { thread_id: threadId },
    },
  );

  // Aakhri system output content validate karke formatting structure create karna
  const lastMessage = result.messages[result.messages.length - 1];
  return typeof lastMessage?.content === "string"
    ? lastMessage.content
    : JSON.stringify(lastMessage?.content ?? "");
}

// ==========================================
// 💻 CLI EXECUTION LOOP (TERMINAL TESTING)
// ==========================================
async function main() {
  const rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const question = await rl.question("User Query: ");

    if (question.toLowerCase() === "exit") {
      break;
    }

    const answer = await askAgent(question);
    console.log("Assistant: ", answer);
  }
  rl.close();
}

// Check kiya ja raha hai ke kya file terminal se chalayi gayi hai ya module import ki shakal mein chal rahi hai
const isCliRun = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isCliRun) {
  main();
}
