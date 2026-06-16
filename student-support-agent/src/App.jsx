import { useState } from "react";

// ==========================================
// 📌 STATIC DATA & CONFIGURATION
// ==========================================

// Quick action buttons ke liye default questions, taake user direct click kar sake
const quickQuestions = [
  "What courses are available?",
  "Do you have any discounts?",
  "Tell me about Generative AI",
  "How can I contact support?",
];

// Chat start hone par pehla message jo agent ki taraf se dikhega
const starterMessages = [
  {
    id: 1,
    sender: "agent",
    text: "Assalam o Alaikum! I am your student support assistant. Ask me about courses, fees, discounts, or learning support.",
  },
];

function App() {
  // ==========================================
  // 🧠 STATE MANAGEMENT (React Hooks)
  // ==========================================

  // Chat history save karne ke liye state (shuru mein starter message hoga)
  const [messages, setMessages] = useState(starterMessages);

  // User jo text type kar raha hai, usko store karne ke liye
  const [input, setInput] = useState("");

  // Jab API call ho rahi ho, toh "Typing..." dikhane aur button disable karne ke liye
  const [isTyping, setIsTyping] = useState(false);

  // Agar API fail ho jaye toh error show karne ke liye
  const [error, setError] = useState("");

  // ==========================================
  // 🚀 CORE FUNCTION: SEND MESSAGE
  // ==========================================
  async function sendMessage(messageText = input) {
    // Faltu spaces ko remove kiya
    const trimmedText = messageText.trim();

    // Agar text khali hai toh function yahin rok do (API call mat bhejo)
    if (!trimmedText) {
      return;
    }

    // 1️⃣ User ka naya message object banaya
    const userMessage = {
      id: Date.now(), // Unique ID ke liye current timestamp use kiya
      sender: "student",
      text: trimmedText,
    };

    // 2️⃣ Optimistic UI Update:
    // User ka message foran screen par dikha do bina API ka wait kiye
    setMessages((currentMessages) => [...currentMessages, userMessage]);

    // Input field ko khali kar do, typing status on karo aur purane errors hata do
    setInput("");
    setIsTyping(true);
    setError("");

    try {
      // 3️⃣ API CALL: Backend server (jo humne Node.js mein banaya) ko message bheja
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedText,
          threadId: "student-web-chat", // Session ID taake backend history yaad rakhe
        }),
      });

      // Response ko JSON mein convert kiya
      const data = await response.json();

      // Agar server ne 200 OK ke ilawa koi error status bheja hai (e.g., 400, 500)
      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      // 4️⃣ Agent ka message object banaya jo backend se aaya hai
      const agentMessage = {
        id: Date.now() + 1,
        sender: "agent",
        text: data.reply,
      };

      // Agent ka message state mein add kar diya taake screen par render ho jaye
      setMessages((currentMessages) => [...currentMessages, agentMessage]);
    } catch (error) {
      // 🚨 Error Handling: Agar net chala jaye ya server band ho
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to connect with agent.";

      setError(errorMessage);

      // Fallback message add kiya taake user ko pata chal jaye ke masla kahan hai
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          sender: "agent",
          text: "Sorry, agent se response nahi aa saka. Please API server aur .env keys check karein.",
        },
      ]);
    } finally {
      // 5️⃣ Cleanup: Chahe request success ho ya fail, typing indicator band kar do
      setIsTyping(false);
    }
  }

  // ==========================================
  // 🎯 EVENT HANDLERS
  // ==========================================

  // Jab user Enter press kare ya Send button dabaye
  function handleSubmit(event) {
    event.preventDefault(); // Page ko refresh hone se rokne ke liye
    sendMessage(); // Main function call kar diya
  }

  // ==========================================
  // 🎨 UI RENDERING (JSX)
  // ==========================================
  return (
    <main className="app-shell">
      <section className="support-panel">
        {/* LEFT SIDEBAR: Brand info aur status dikhane ke liye */}
        <aside className="sidebar">
          <div>
            <p className="eyebrow">Systems Limited</p>
            <h1>Student Support Agent</h1>
            <p className="sidebar-text">
              A clean assistant UI for course information, marketing support,
              and learning help.
            </p>
          </div>

          <div className="status-box">
            <span className="status-dot"></span>
            <div>
              <strong>Online</strong>
              <p>Front desk support is ready</p>
            </div>
          </div>

          {/* Simple step-by-step guide for the user */}
          <div className="info-list">
            <div>
              <span>01</span>
              <p>Ask your question</p>
            </div>
            <div>
              <span>02</span>
              <p>Agent checks the right team</p>
            </div>
            <div>
              <span>03</span>
              <p>Get a clear answer</p>
            </div>
          </div>
        </aside>

        {/* RIGHT CHAT AREA: Jahan actual conversation hogi */}
        <section className="chat-card">
          <header className="chat-header">
            <div>
              <p className="eyebrow">Live Chat</p>
              <h2>How can we help today?</h2>
            </div>
            <span className="team-badge">Front Desk</span>
          </header>

          {/* QUICK ACTIONS: Pre-defined buttons jo direct message send karte hain */}
          <div className="quick-actions">
            {quickQuestions.map((question) => (
              <button
                className="quick-button"
                key={question}
                onClick={() => sendMessage(question)} // Click par directly yahi text send hoga
                type="button"
              >
                {question}
              </button>
            ))}
          </div>

          {/* CHAT MESSAGES CONTAINER: Yahan saari history map ho rahi hai */}
          <div className="messages" aria-live="polite">
            {messages.map((message) => (
              <div className={`message-row ${message.sender}`} key={message.id}>
                {/* Avatar: Agent ke liye 'A' aur Student ke liye 'S' */}
                <div className="avatar">
                  {message.sender === "agent" ? "A" : "S"}
                </div>
                <p className="message-bubble">{message.text}</p>
              </div>
            ))}

            {/* TYPING INDICATOR: Sirf tab dikhega jab API call chal rahi ho */}
            {isTyping && (
              <div className="message-row agent">
                <div className="avatar">A</div>
                <p className="message-bubble typing">Typing...</p>
              </div>
            )}
          </div>

          {/* ERROR DISPLAY: Agar koi error state mein mojood hai */}
          {error && <p className="error-text">{error}</p>}

          {/* INPUT FORM: Message type aur send karne ka area */}
          <form className="chat-form" onSubmit={handleSubmit}>
            <input
              aria-label="Message"
              onChange={(event) => setInput(event.target.value)} // Type karte waqt state update
              placeholder="Type your question here..."
              value={input}
              disabled={isTyping} // Request ke doran input lock kar diya
            />
            <button disabled={isTyping} type="submit">
              {isTyping ? "Wait" : "Send"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

export default App;
