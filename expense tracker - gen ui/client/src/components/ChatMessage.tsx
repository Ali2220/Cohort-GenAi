import { User, Sparkles, TerminalSquare } from "lucide-react";
import type { StreamMessage } from "../type.ts";
import { ExpenseChart } from "./ExpenseChart.tsx";

type Props = {
  message: StreamMessage;
};

export function ChatMessage({ message }: Props) {
  if (message.type === "user") {
    return (
      <div className="flex justify-end group animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-[80%] flex flex-col items-end gap-1.5">
          <div className="bg-zinc-800 text-zinc-100 px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-md text-[15px] leading-relaxed whitespace-pre-wrap wrap-break-word">
            {message.payload.text}
          </div>
        </div>
      </div>
    );
  } else if (message.type === "ai") {
    return (
      <div className="flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">
        <div className="shrink-0 mt-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="flex-1 space-y-2 overflow-hidden py-1">
          <div className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            Nexus AI
          </div>
          <div className="text-zinc-300 whitespace-pre-wrap wrap-break-word leading-relaxed text-[15px]">
            {message.payload.text}
          </div>
        </div>
      </div>
    );
  } else if (message.type === "toolCall:start") {
    return (
      <div className="flex gap-4 animate-in fade-in duration-300 pl-[3.25rem]">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#121214] border border-white/5 rounded-full shadow-sm">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
          </div>
          <div className="text-xs font-medium text-zinc-400">
            Using tool: <span className="text-indigo-400 font-mono ml-1">{message.payload.name}</span>
          </div>
        </div>
      </div>
    );
  } else if (message.type === "tool") {
    const { name, result } = message.payload;

    if (name === "generate_chart") {
      return (
        <div className="pl-[3.25rem] py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ExpenseChart data={result.data} labelKey={result.labelKey} />
        </div>
      );
    }

    return (
      <div className="pl-[3.25rem] py-2">
        <div className="flex flex-col gap-2 rounded-2xl bg-[#121214] border border-white/5 overflow-hidden shadow-lg group">
          <div className="flex items-center gap-2 bg-black/20 px-4 py-2 border-b border-white/5">
            <TerminalSquare className="w-4 h-4 text-zinc-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Tool Payload: {name}
            </span>
          </div>
          <div className="p-4 text-xs font-mono text-zinc-400 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      </div>
    );
  }

  return null;
}