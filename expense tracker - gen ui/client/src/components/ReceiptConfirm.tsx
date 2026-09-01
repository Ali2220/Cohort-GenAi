import { useState } from "react";
import { Check, X, ReceiptText, AlertTriangle, ChevronRight } from "lucide-react";

type ExtractedData = {
  amount: number;
  title: string;
  category: string;
  date: string;
  confidence: "high" | "medium" | "low";
};

type Props = {
  imagePreview: string;
  data: ExtractedData;
  onConfirm: (data: ExtractedData) => void;
  onCancel: () => void;
};

const CATEGORIES = ["food", "groceries", "transport", "shopping", "bills", "entertainment", "health", "other"];

export function ReceiptConfirm({ imagePreview, data, onConfirm, onCancel }: Props) {
  const [form, setForm] = useState<ExtractedData>(data);

  return (
    <div className="w-full max-w-[90%] md:max-w-md bg-[#121214] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative group my-4">
      {/* Top Gradient Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-xl">
            <ReceiptText className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">Review Receipt</h4>
            <p className="text-[11px] text-zinc-500 font-medium">Verify extracted details</p>
          </div>
        </div>

        {data.confidence === "low" && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold tracking-wide uppercase border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> Needs Review
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4 p-5">
        {/* Image Thumbnail */}
        <div className="w-full h-[140px] sm:h-full bg-black/40 rounded-2xl overflow-hidden border border-white/5 p-1">
          <img
            src={imagePreview}
            alt="Scanned Receipt"
            className="w-full h-full object-cover rounded-xl opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>

        {/* Editable Form */}
        <div className="space-y-4">
          <div className="relative">
            <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 absolute -top-2 left-3 bg-[#121214] px-1">
              Amount (Rs)
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
            />
          </div>

          <div className="relative">
            <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 absolute -top-2 left-3 bg-[#121214] px-1">
              Title / Merchant
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 absolute -top-2 left-3 bg-[#121214] px-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-transparent border border-white/10 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 appearance-none transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-zinc-900">
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 absolute -top-2 left-3 bg-[#121214] px-1">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-transparent border border-white/10 rounded-xl px-3 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-white/[0.02] border-t border-white/5 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-transparent border border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white transition-all text-sm font-medium"
        >
          <X className="w-4 h-4" /> Discard
        </button>
        <button
          onClick={() => onConfirm(form)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all hover:scale-[1.02] active:scale-95 text-sm font-semibold"
        >
          Confirm <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}