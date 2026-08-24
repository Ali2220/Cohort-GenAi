import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { database } from "./agent.js";

export const addExpense = tool(
  ({ title, amount }) => {
    try {
      // expenses table ke liye parameterized INSERT statement tayar karna
      const insert = database.prepare(
        "INSERT INTO expenses (title, amount) VALUES (?, ?)",
      );

      // Statement ko bound values (title, amount) ke saath execute karna
      const result = insert.run(title, amount);

      return JSON.stringify({
        status: "success",
        expenseId: result.lastInsertRowid,
        title,
        amount,
      });
    } catch (err) {
      return JSON.stringify({
        status: "error",
        message: "Failed to add expense to database",
      });
    }
  },
  {
    name: "add_expense",
    description: "add expense in DB",
    schema: z.object({
      title: z.string().describe("The title of expense"),
      amount: z.number().describe("The amount spent"),
    }),
  },
);

export const getExpenses = tool(
  ({ from, to }) => {
    try {
      const stmt = database.prepare(`
                SELECT * FROM expenses 
                WHERE DATE(created_at) BETWEEN ? AND ? 
                ORDER BY created_at DESC
                `);

      const rows = stmt.all(from, to);
      console.log("rows:", rows);

      return JSON.stringify({
        status: "success",
        rows,
      });
    } catch (err) {
      return JSON.stringify({
        status: "error",
        message: "Failed to get expenses from Database",
      });
    }
  },
  {
    name: "get_expenses",
    description: "get expenses from DB",
    schema: z.object({
      from: z.string().describe("This is a from Date. Format is YYYY-MM-DD"),
      to: z.string().describe("This is a to Date. Format is YYYY-MM-DD"),
    }),
  },
);

export const generateChart = tool(
  ({ from, to, groupBy }) => {
    try {
      let groupExpression: string;

      switch (groupBy) {
        case "month":
          // Output format: "2026-07" (Year-Month)
          groupExpression = "STRFTIME('%Y-%m', created_at)";
          break;

        case "week":
          // Output format: "2026-W29" (Year + Week Number)
          groupExpression = "STRFTIME('%Y-W%W', created_at)";
          break;

        case "date":
        default:
          // Output format: "2026-07-23"
          groupExpression = "DATE(created_at)";
          break;
      }

      // Dynamic aggregation SQL query (Expenses sum aur count calculate karne ke liye)
      const query = `
                SELECT 
                    ${groupExpression} AS label,
                    SUM(amount) AS total,
                    COUNT(*) AS total_transactions
                FROM expenses
                WHERE DATE(created_at) BETWEEN ? AND ?
                GROUP BY label
                ORDER BY label ASC
            `;

      // Prepared statement execution (SQL Injection protection ke sath)
      const stmt = database.prepare(query);
      const chartData = stmt.all(from, to);

      // Data Transformation: Row data ko dynamic key ([groupBy]) mein map karna
      // Result example: [{ "month": "2026-07", "amount": 450 }]
      const result = chartData.map((row) => {
        return {
          [groupBy]: row.label,
          amount: row.total,
        };
      });

      return JSON.stringify({
        type: "chart",
        data: result,
        labelKey: groupBy,
      });
    } catch (err) {
      console.error("Error generating chart data:", err);
      return JSON.stringify({
        status: "error",
        message: "Failed to fetch aggregated chart data from database",
      });
    }
  },
  {
    name: "generate_chart",
    description:
      "CRITICAL: Call this tool ONLY when the user explicitly asks to visualize, chart, or see a graph representation of their expenses over a date range.",
    schema: z.object({
      from: z.string().describe("This is a from Date. Format is YYYY-MM-DD"),
      to: z.string().describe("This is a to Date. Format is YYYY-MM-DD"),
      groupBy: z
        .enum(["month", "week", "date"])
        .describe(
          "Group aggregation type: 'date' for daily breakdown, 'week' for weekly, and 'month' for monthly breakdown.",
        ),
    }),
  },
);
