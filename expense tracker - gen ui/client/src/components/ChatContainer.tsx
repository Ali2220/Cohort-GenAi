import { useState, useRef, useEffect } from "react";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { ReceiptConfirm } from "./ReceiptConfirm";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { Sparkles, Loader2 } from "lucide-react";
import type { StreamMessage } from "../type.ts";

export function ChatContainer() {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Receipt scanner states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<{
    image: string;
    extracted: {
      amount: number;
      title: string;
      category: string;
      date: string;
      confidence: "high" | "medium" | "low";
    };
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isScanning, receiptData]);

  const handleFileSelect = (base64: string | null) => {
    setSelectedImage(base64);
    setReceiptData(null);
    if (base64) {
      scanReceiptImage(base64);
    }
  };

  async function scanReceiptImage(base64: string) {
    setIsScanning(true);
    try {
      const res = await fetch("http://localhost:3000/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      const result = await res.json();

      if (result.success) {
        setReceiptData({
          image: base64,
          extracted: result.extracted,
        });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + Math.random().toString(),
            type: "ai",
            payload: { text: `❌ ${result.error}` },
          },
        ]);
        setSelectedImage(null);
      }
    } catch (err) {
      console.error("Scan failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random().toString(),
          type: "ai",
          payload: { text: "❌ Failed to scan receipt. Please try again." },
        },
      ]);
      setSelectedImage(null);
    } finally {
      setIsScanning(false);
    }
  }

  const handleReceiptConfirm = (data: {
    amount: number;
    title: string;
    category: string;
    date: string;
  }) => {
    setReceiptData(null);
    setSelectedImage(null);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(),
        type: "user",
        payload: { text: `📸 Receipt Scanned: **${data.title}** — Rs ${data.amount}` },
      },
    ]);

    const command = `Add expense of Rs ${data.amount} for ${data.title} under category ${data.category} on date ${data.date}`;
    submitQuery(command);
  };

  const handleReceiptCancel = () => {
    setReceiptData(null);
    setSelectedImage(null);
  };

  async function submitQuery(userInput: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(),
        type: "user",
        payload: { text: userInput },
      },
    ]);

    await fetchEventSource("http://localhost:3000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: userInput }),

      onmessage(ev) {
        const parsedData = JSON.parse(ev.data) as StreamMessage;

        setMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];

          if (parsedData.type === "ai") {
            if (lastMessage && lastMessage.type === "ai") {
              return [
                ...prevMessages.slice(0, -1),
                {
                  ...lastMessage,
                  payload: {
                    text:
                      (lastMessage.payload.text || "") +
                      (parsedData.payload.text || ""),
                  },
                },
              ];
            }
            return [
              ...prevMessages,
              {
                id: Date.now().toString() + Math.random().toString(),
                type: "ai",
                payload: { text: parsedData.payload.text },
              },
            ];
          }

          if (parsedData.type === "toolCall:start" || parsedData.type === "tool") {
            return [
              ...prevMessages,
              {
                id: Date.now().toString() + Math.random().toString(),
                type: parsedData.type,
                payload: parsedData.payload,
              } as StreamMessage,
            ];
          }

          return prevMessages;
        });
      },
    });
  }

  const onSubmit = (userInput: string) => {
    if (!userInput.trim()) return;
    submitQuery(userInput);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#09090b] text-zinc-100 font-sans selection:bg-purple-500/30">
      {/* Sleek Glassmorphism Header */}
      <header className="shrink-0 sticky top-0 z-50 border-b border-white/[0.05] bg-[#09090b]/70 backdrop-blur-xl w-full shadow-sm">
        <div className="w-full max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Nexus Expense AI
              </h1>
              <p className="text-xs text-zinc-400 font-medium">Smart financial assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-emerald-500 tracking-wide uppercase">
              Online
            </span>
          </div>
        </div>
      </header>

      {/* Main Chat Scroll Area */}
      <main className="flex-1 overflow-y-auto w-full scroll-smooth scrollbar-thin scrollbar-thumb-zinc-800">
        <div className="w-full max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
          {messages.length === 0 && !isScanning && !receiptData && (
            <div className="flex flex-col items-center justify-center h-64 text-center opacity-60">
              <Sparkles className="w-12 h-12 text-zinc-500 mb-4" />
              <h2 className="text-xl font-semibold text-zinc-300">How can I help you today?</h2>
              <p className="text-sm text-zinc-500 mt-2 max-w-md">
                Upload a receipt to scan or type a command like "Add 500 Rs for coffee today".
              </p>
            </div>
          )}

          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}

          {/* Scanning State */}
          {isScanning && (
            <div className="flex items-center gap-3 text-purple-400 bg-purple-500/10 border border-purple-500/20 px-5 py-4 rounded-2xl w-fit self-start animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Analyzing receipt via vision model...</span>
            </div>
          )}

          {/* Receipt Confirmation Widget */}
          {receiptData && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <ReceiptConfirm
                imagePreview={receiptData.image}
                data={receiptData.extracted}
                onConfirm={handleReceiptConfirm}
                onCancel={handleReceiptCancel}
              />
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* Floating Input Area */}
      <div className="shrink-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/90 to-transparent pt-6 pb-8 w-full z-40">
        <ChatInput
          onSubmit={onSubmit}
          onFileSelect={handleFileSelect}
          selectedImage={selectedImage}
        />
      </div>
    </div>
  );
}