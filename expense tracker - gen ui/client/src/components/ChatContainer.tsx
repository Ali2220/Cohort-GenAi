import { useState } from "react";
import { ChatInput } from "./ChatInput";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { ChatMessage } from "./ChatMessage";
import type { StreamMessage } from "../type.ts";

export function ChatContainer() {
  // 'messages' state hamari puri chat history ko array ki shakal mein store karti hai
  const [messages, setMessages] = useState<StreamMessage[]>([]);

  async function submitQuery(userInput: string) {
    // 1. Sab se pehle user ka type kiya hua message UI par dikhane ke liye state update karein
    setMessages((prevMessages) => {
      return [
        ...prevMessages, // Purane tamam messages apni jagah barkarar rakhein
        {
          id: Date.now().toString() + Math.random().toString(), // Naye message ke liye unique ID
          type: "user", // Message kiski taraf se hai (User)
          payload: { text: userInput }, // User ka asal text yahan aayega
        },
      ];
    });

    // 2. Backend par Server-Sent Events (SSE) connection establish karein taake stream receive ho sake
    await fetchEventSource("http://localhost:3000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: userInput }), // User ki query backend ko bhej rahe hain

      // 3. Jab bhi backend se data ka naya tukra (chunk) aayega, ye function lagatar chalega
      onmessage(ev) {
        // Backend se aane wale raw string data ko proper JavaScript object mein convert kar rahe hain
        const parsedData = JSON.parse(ev.data) as StreamMessage;

        setMessages((prevMessages) => {
          // Array ka aakhri message nikal rahe hain taake pata chale chat kahan ruki thi
          const lastMessage = prevMessages[prevMessages.length - 1];

          // CONDITION A: Agar backend se AI ka text chunk aaya hai (Typing mode)
          if (parsedData.type === "ai") {
            // SCENARIO 1: Agar pichla message bhi AI ka hi tha, toh naya bubble nahi banana balke text update karna hai
            if (lastMessage && lastMessage.type === "ai") {
              return [
                ...prevMessages.slice(0, -1), // Aakhri message ko chhor kar array ke baqi tamam messages le lo
                {
                  ...lastMessage, // Aakhri message ki properties (jaise ID aur type) yahan copy kar lo taake wo delete na hon
                  payload: {
                    // Purane text ke aage naya aane wala text jod (append) do.
                    // (|| "") lagana zaroori hai taake string null/undefined hone par app crash na ho
                    text:
                      (lastMessage.payload.text || "") +
                      (parsedData.payload.text || ""),
                  },
                },
              ]; // 🛑 Early Return: Yahan state update hui aur function yahi se wapas nikal jayega
            }

            // SCENARIO 2: Agar pichla message user ya tool ka tha, toh AI ka pehla word aane par naya bubble banao
            return [
              ...prevMessages, // Purane sab messages array mein daalo
              {
                id: Date.now().toString() + Math.random().toString(), // AI ke naye bubble ki fresh ID
                type: "ai",
                payload: { text: parsedData.payload.text }, // Stream hone wala pehla chunk
              },
            ]; // 🛑 Early Return
          }

          // CONDITION B: Agar backend ne bataya ke Tool chal raha hai (e.g., "get_expenses")
          if (parsedData.type === "toolCall:start") {
            return [
              ...prevMessages,
              {
                id: Date.now().toString() + Math.random().toString(),
                type: "toolCall:start", // specifically tool event ka type
                payload: parsedData.payload, // Isme text nahi hota, balke tool ka 'name' aur 'args' aate hain
              },
            ]; // 🛑 Early Return
          }

          // DEFAULT CONDITION: Agar upar ki koi condition true nahi hoti (koi anjaan event aa jaye),
          // toh purani state waisi ki waisi wapas kar do taake UI par error na aaye.
          return prevMessages;
        });
      },
    });
  }

  const onSubmit = (userInput: string) => {
    console.log("user input: ", userInput); // Debugging ke liye
    submitQuery(userInput); // Asal function call jo chat ka flow shuru karega
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950">
      {/* ============================================
          HEADER: Top bar with logo + status
          ============================================ */}
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl w-full">
        <div className="w-full max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-100">
                AI Expense Tracker
              </h1>
              <p className="text-xs text-zinc-500">Powered by advanced AI</p>
            </div>
          </div>

          {/* Online Status Badge */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
              Online
            </span>
          </div>
        </div>
      </div>

      {/* ============================================
          MESSAGES AREA: Chat messages ya Empty State
          ============================================ */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="w-full max-w-5xl mx-auto">
          {/* ============================================
              EMPTY STATE: Jab koi message nahi hai
              ============================================ */}
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-6 py-8">
              {/* Animated Logo */}
              <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-2xl mb-6 animate-pulse">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>

              {/* Heading */}
              <h2 className="text-3xl font-bold text-zinc-100 mb-3">
                How can I help you today?
              </h2>
              <p className="text-zinc-500 text-center max-w-md mb-8">
                Ask me anything, and I'll do my best to assist you with
                information, analysis, and creative solutions.
              </p>

              {/* Suggestion Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                {[
                  {
                    icon: "💡",
                    title: "Get ideas",
                    desc: "Brainstorm creative solutions",
                  },
                  {
                    icon: "📊",
                    title: "Analyze data",
                    desc: "Extract insights from information",
                  },
                  {
                    icon: "✍️",
                    title: "Write content",
                    desc: "Create engaging text and copy",
                  },
                  {
                    icon: "🔧",
                    title: "Solve problems",
                    desc: "Find answers to your questions",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/50 hover:border-purple-500/50 transition-all cursor-pointer group"
                  >
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="text-sm font-medium text-zinc-200 group-hover:text-purple-400 transition-colors">
                      {item.title}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ============================================
               MESSAGES LIST: Jab messages hain
               ============================================ */
            <div className="divide-y divide-zinc-800/50">
              {/* TODO: Yahan messages map honge */}
              {messages.map((message) => {
                return (
                  <div key={message.id}>
                    <ChatMessage message={message} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============================================
          INPUT AREA: Bottom chat input
          ============================================ */}
      <div className="shrink-0 w-full">
        <ChatInput onSubmit={onSubmit} />
      </div>
    </div>
  );
}
