"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useEditorStore } from "@/store/useEditorState";

export const RightSidebar = () => {
  // ======================================
  // ZUSTAND STATES & ACTIONS
  // ======================================

  // History mein saved tamam images
  // Current selected index
  // Aur image select karne ka action
  const { history, currentIndex, selectVersion, clearHistory } = useEditorStore();

  return (
    <aside className="flex h-full w-40 flex-col shrink-0 border-l border-zinc-800 bg-zinc-950/50 z-20 overflow-hidden">
      {/* ==================================
          HISTORY IMAGES
      ================================== */}

      <div className="flex-1 min-h-0 w-full">
        <ScrollArea className="h-full w-full">
          <div className="flex flex-col gap-4 p-4 pb-4">
            {/* Agar history empty hai */}
            {history.length === 0 ? (
              <div className="text-center py-10">
                <span className="text-xs text-zinc-600">No history yet</span>
              </div>
            ) : (
              // History mein saved har image ko
              // dynamically render karo
              history.map((historyImage, index) => {
                // Check karo kya ye selected image hai
                const isActive = currentIndex === index;

                return (
                  <div key={index} className="relative group">
                    {/* IMAGE BUTTON */}
                    <button
                      type="button"
                      // Image click par selectVersion call hoga
                      // Aur selected image canvas par show hogi
                      onClick={() => selectVersion(index)}
                      aria-label={`Select version ${index + 1}`}
                      aria-pressed={isActive}
                      className={cn(
                        "relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer",

                        // Active image par yellow border
                        isActive
                          ? "border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                          : "border-zinc-800 hover:border-zinc-600 opacity-60 hover:opacity-100",
                      )}
                    >
                      {/* ACTUAL HISTORY IMAGE */}
                      <Image
                        width={500}
                        height={500}
                        src={historyImage}
                        alt={`Version ${index + 1}`}
                        unoptimized
                        className="w-full h-full object-cover"
                      />

                      {/* Active image ka yellow overlay */}
                      {isActive && (
                        <div className="absolute inset-0 bg-yellow-500/5 pointer-events-none" />
                      )}
                    </button>

                    {/* ==================================
                        VERSION NUMBER BADGE
                    ================================== */}

                    <div
                      className={cn(
                        "absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shadow-md z-10 pointer-events-none",

                        // Active image ka badge yellow hoga
                        isActive
                          ? "bg-yellow-500 text-zinc-950"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700",
                      )}
                    >
                      {index + 1}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* FOOTER - CLEAR HISTORY */}

      <div className="p-3 border-t border-zinc-800 shrink-0 bg-zinc-950/80 backdrop-blur-sm z-30">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-lg"
                // Clear history abhi implement nahi karni
                disabled={history.length <= 1}
                onClick={clearHistory}
              >
                <Trash2 size={14} className="mr-2" />

                <span className="text-xs">Clear History</span>
              </Button>
            </TooltipTrigger>

            <TooltipContent side="left">
              <p>Clear all except current</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
};
