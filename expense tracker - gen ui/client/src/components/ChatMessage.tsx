import { User, Brain, Settings } from "lucide-react";
import type { StreamMessage } from "../type.ts";
import { ExpenseChart } from "./ExpenseChart.tsx";

type Props = {
  message: StreamMessage;
};

export function ChatMessage({ message }: Props) {
  if (message.type === "user") {
    return (
      <div className="flex gap-4 py-6 px-6 transition-colors">
        <div className="shrink-0">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-white-500 via-white-500 to-gray-500 flex items-center justify-center shadow-lg">
            <User color="white" />
          </div>
        </div>
        <div className="flex-1 space-y-2 overflow-hidden">
          <div className="text-sm font-medium text-zinc-300">User</div>
          <div className="text-zinc-100 whitespace-pre-wrap wrap-break-word leading-7">
            {message.payload.text}
          </div>
        </div>
      </div>
    );
  } else if (message.type === "ai") {
    return (
      <div className="flex gap-4 py-6 px-6 transition-colors">
        <div className="shrink-0">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-white-500 via-white-500 to-gray-500 flex items-center justify-center shadow-lg">
            <Brain color="yellow" />
          </div>
        </div>
        <div className="flex-1 space-y-2 overflow-hidden">
          <div className="text-sm font-medium text-zinc-300">AI</div>
          <div className="text-zinc-100 whitespace-pre-wrap wrap-break-word leading-7">
            {message.payload.text}
          </div>
        </div>
      </div>
    );
  } else if (message.type === "toolCall:start") {
    return (
      <div className="flex gap-4 py-4 px-6 transition-colors bg-zinc-900/30">
        <div className="shrink-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shadow-inner">
            {/* Settings icon animate karega (ghoomega) */}
            <Settings className="text-zinc-400 animate-spin" size={18} />
          </div>
        </div>
        <div className="flex-1 flex items-center">
          <div className="text-sm font-medium text-zinc-400 italic">
            {/* Tool ka naam display kar rahe hain */}
            Agent is running tool:{" "}
            <span className="text-purple-400 font-mono ml-1">
              {message.payload.name}
            </span>
            ...
          </div>
        </div>
      </div>
    );
  } else if (message.type === "tool") {
    const { name, result } = message.payload;

    if (message.payload.name === "generate_chart") {
      return (
        <div className="py-4">
          {/* result.data ya jahan bhi backend data array bhej raha hai wo pass karein */}
          <ExpenseChart data={result.data} labelKey={result.labelKey} />
        </div>
      );
    }

    return (
      <div className="flex gap-4 py-4 px-6 my-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex-1 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-purple-400">
            Tool Output: {name || "Result"}
          </div>

          {/* Output JSON data render kar rahe hain */}
          <div className="text-sm font-mono text-zinc-300 bg-zinc-950 p-3 rounded-lg overflow-x-auto border border-zinc-800/80">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      </div>
    );
  }
}
