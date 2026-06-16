import http from "node:http";
import { askAgent } from "./graph.js";

// ==========================================
// ⚙️ PORT CONFIGURATION
// ==========================================
// Environment variable (process.env.PORT) se port uthayega,
// agar deployment environment nahi hai toh default 3001 use karega.
const PORT = Number(process.env.PORT || 3001);

// ==========================================
// 🛠️ HELPER FUNCTIONS
// ==========================================

/**
 * Helper Function: Frontend ko JSON response bhejne ke liye.
 * Ismein CORS (Cross-Origin Resource Sharing) ke headers lagaye gaye hain,
 * taake jab aapka React Frontend (jo normal 5173 port par chalta hai) is API ko request bhejega,
 * toh browser use block na kare (CORS Error na aaye).
 */
function sendJson(
  response: http.ServerResponse,
  statusCode: number,
  data: unknown,
) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // '*' ka matlab hai kisi bhi frontend domain se requests accept hongi
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS", // Kaunse HTTP methods allowed hain
    "Access-Control-Allow-Headers": "Content-Type", // Kaunse custom headers accept ho sakte hain
  });
  response.end(JSON.stringify(data));
}

/**
 * Helper Function: Incoming Request ka Raw Data (Body) read karne ke liye.
 * Chunke node:http mein Express ki tarah `req.body` automatic nahi milta,
 * isliye hum data chunks ko stream se catch karke ek poori string banate hain.
 */
function readBody(request: http.IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = "";

    // Jab data ka chota naya chunk (tukra) aayega, use `body` string mein joor do
    request.on("data", (chunk) => {
      body += chunk;
    });

    // Jab saara data complete receive ho jaye, toh resolve (return) kardo
    request.on("end", () => resolve(body));

    // Agar data read karte hue koi error aaye toh reject kardo
    request.on("error", reject);
  });
}

// ==========================================
// 🚀 MAIN HTTP SERVER LOGIC
// ==========================================
const server = http.createServer(async (request, response) => {
  // 1️⃣ CORS Preflight Request Check:
  // Browser jab bhi cross-origin POST request bhejta hai, toh woh pehle check karne ke liye
  // aik 'OPTIONS' request bhejta hai. Hum yahan use direct HTTP 200 OK de kar allow kar rahe hain.
  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  // 2️⃣ Health Check Endpoint:
  // Yeh check karne ke liye hota hai ke server up aur alive hai ya nahi (Render/Vercel wagera par zaroorat parti hai)
  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  // 3️⃣ Main Chat Endpoint (POST /api/chat):
  // React Frontend isi endpoint par user ka message POST request ke zariye bhejega
  if (request.method === "POST" && request.url === "/api/chat") {
    try {
      // Stream chunks se complete text body read ki
      const body = await readBody(request);

      // JSON string ko JavaScript Object mein convert kiya
      const data = JSON.parse(body || "{}");

      // Request se user ka message aur session/thread ID nikali
      const message = String(data.message || "").trim();
      const threadId = String(data.threadId || "web-user"); // Default threadId 'web-user' rakhi agar frontend se na aaye

      // Validation: Agar message khali hai toh HTTP 400 Bad Request error return kardo
      if (!message) {
        sendJson(response, 400, { error: "Message is required." });
        return;
      }

      // 🧠 LANGGRAPH AGENT CALL:
      // graph.ts se import kiya hua function chalaya jo state-graph ko trigger karega
      // aur Pinecone/LLM se hota hua final answer la kar dega.
      const reply = await askAgent(message, threadId);

      // Final response ko HTTP 200 status ke sath object bana kar frontend ko bhej diya
      sendJson(response, 200, { reply });
    } catch (error) {
      // Agar backend par ya API Keys (OpenAI/Pinecone) mein koi error aata hai toh console par log hoga
      console.error(error);

      // User ko crash screen ke bajaye ek clean professional HTTP 500 Internal Server Error message jayega
      sendJson(response, 500, {
        error:
          "Agent response failed. Please check your API keys and server logs.",
      });
    }

    return;
  }

  // 4️⃣ Fallback: Agar koi naya endpoint hit ho jo upar defined nahi hai, toh direct 404 Route Not Found de do
  sendJson(response, 404, { error: "Route not found." });
});

// ==========================================
// 🔌 START THE SERVER
// ==========================================
server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
