import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "./ui/chart";
import type { ChartConfig } from "./ui/chart";

const chartConfig = {
    amount: {
        label: "Expense Amount",
        color: "#8b5cf6", // Purple-500 color
    },
} satisfies ChartConfig;

// Prop mein labelKey add kiya (default "date")
export function ExpenseChart({ data, labelKey = "date" }: { data: any[], labelKey?: string }) {
    if (!data || data.length === 0) {
        return <div className="text-zinc-500 text-sm">No data to display.</div>;
    }

    return (
        <div className="w-full max-w-2xl bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-xl">
            <h3 className="text-zinc-100 font-semibold mb-6">Spending Overview</h3>

            <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                <BarChart
                    accessibilityLayer
                    data={data}
                    margin={{ top: 10, right: 10, bottom: 20, left: 0 }}
                >
                    <CartesianGrid
                        vertical={false}
                        stroke="#27272a"
                        strokeDasharray="4 4"
                    />

                    <XAxis
                        dataKey={labelKey} // Backend se aane wali dynamic key (month, week ya date)
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        stroke="#a1a1aa"
                        fontSize={12}
                        tickFormatter={(value) => {
                            // Agar daily data hai toh date ko khoobsurat format ("Aug 25") mein convert karein
                            if (labelKey === 'date' && typeof value === 'string') {
                                const date = new Date(value);
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            }
                            // Month aur Week ke liye as it is show karein
                            return value;
                        }}
                    />

                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `Rs ${value}`}
                        stroke="#a1a1aa"
                        fontSize={12}
                        width={60}
                    />

                    <ChartTooltip
                        cursor={{ fill: "#27272a", opacity: 0.4 }}
                        content={<ChartTooltipContent indicator="dashed" />}
                    />

                    <Bar
                        dataKey="amount"
                        fill="var(--color-amount)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={50} // Bar ki maximum width taake single entry par ajeeb na lage
                    />
                </BarChart>
            </ChartContainer>
        </div>
    );
}