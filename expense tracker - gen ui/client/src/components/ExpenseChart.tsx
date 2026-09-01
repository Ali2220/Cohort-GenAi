import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";

export function ExpenseChart({ data, labelKey = "date" }: { data: any[]; labelKey?: string }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center p-8 bg-[#121214] border border-white/5 rounded-3xl">
                <span className="text-zinc-500 text-sm font-medium">No data available for chart.</span>
            </div>
        );
    }

    return (
        <div className="w-full bg-[#121214] border border-white/5 p-6 rounded-3xl shadow-2xl relative overflow-hidden group">
            {/* Decorative Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-purple-500/10 blur-[50px] pointer-events-none rounded-full" />

            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-zinc-100 font-semibold text-sm">Spending Analysis</h3>
                    <p className="text-zinc-500 text-xs">Based on recent transactions</p>
                </div>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                        <defs>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="#ec4899" stopOpacity={0.4} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid vertical={false} stroke="#ffffff" strokeOpacity={0.05} strokeDasharray="4 4" />

                        <XAxis
                            dataKey={labelKey}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                            stroke="#71717a"
                            fontSize={11}
                            tickFormatter={(value) => {
                                if (labelKey === "date" && typeof value === "string") {
                                    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                                }
                                return value;
                            }}
                        />

                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `Rs ${value}`}
                            stroke="#71717a"
                            fontSize={11}
                            width={80}
                        />

                        <Tooltip
                            cursor={{ fill: "rgba(255,255,255,0.02)" }}
                            contentStyle={{
                                backgroundColor: "#18181b",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "12px",
                                boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                                color: "#e4e4e7",
                                fontSize: "12px",
                                fontWeight: 500,
                            }}
                            itemStyle={{ color: "#a855f7", fontWeight: 600 }}
                            formatter={(value: number) => [`Rs ${value.toLocaleString()}`, "Amount"]}
                            labelStyle={{ color: "#a1a1aa", marginBottom: "4px" }}
                        />

                        <Bar
                            dataKey="amount"
                            fill="url(#colorAmount)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={48}
                            animationDuration={1000}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}