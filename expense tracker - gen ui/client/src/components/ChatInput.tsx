import { useState, useRef, useEffect } from "react";
import { Paperclip, X, SendHorizonal, Image as ImageIcon } from "lucide-react";

type Props = {
  onSubmit: (userInput: string) => void;
  onFileSelect: (base64: string | null) => void;
  selectedImage: string | null;
};

export function ChatInput({ onSubmit, onFileSelect, selectedImage }: Props) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onFileSelect(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userInput = input.trim();
    if (userInput) {
      onSubmit(userInput);
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <form
        onSubmit={handleSubmit}
        className="relative flex flex-col bg-[#121214] rounded-[2rem] border border-white/10 shadow-2xl focus-within:border-purple-500/50 focus-within:ring-4 focus-within:ring-purple-500/10 transition-all duration-300"
      >
        {/* Selected Image Preview Box */}
        {selectedImage && (
          <div className="pt-4 px-4 pb-2 flex items-center gap-3 border-b border-white/5 animate-in fade-in slide-in-from-bottom-2">
            <div className="relative group rounded-xl overflow-hidden shadow-md">
              <img
                src={selectedImage}
                alt="Selected receipt"
                className="h-16 w-16 object-cover bg-black"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-transform hover:scale-110 shadow-lg"
                >
                  <X className="w-3 h-3" strokeWidth={3} />
                </button>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-zinc-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-purple-400" /> Image Attached
              </span>
              <span className="text-xs text-zinc-500">Ready to scan...</span>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2 p-2 relative">
          {/* File Input Trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`shrink-0 ml-2 mb-1.5 p-3 rounded-full transition-all duration-300 ${selectedImage
                ? "bg-purple-500/20 text-purple-400"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-white/10"
              }`}
            title="Upload Receipt"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedImage
                ? "Add a note to your receipt (optional)..."
                : "Type an expense or upload a receipt..."
            }
            rows={1}
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 py-4 px-2 resize-none focus:outline-none max-h-40 overflow-y-auto text-[15px] leading-relaxed"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() && !selectedImage}
            className="shrink-0 mr-2 mb-1.5 p-3 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] disabled:opacity-30 disabled:grayscale disabled:hover:shadow-none transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
          >
            <SendHorizonal className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </div>
  );
}