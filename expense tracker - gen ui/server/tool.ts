import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { database } from "./agent.js";

export const addExpense = tool(
    // Ye function actual implementation hai jo LLM call karega
    ({ title, amount }) => {
        try {
            // expenses table ke liye parameterized INSERT statement tayar karna
            const insert = database.prepare(
                "INSERT INTO expenses (title, amount) VALUES (?, ?)"
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
    }
);

export const getExpenses = tool(
    // Ye function actual implementation hai jo LLM call karega
    ({ from, to }) => {
        try {

            const stmt = database.prepare(`
                SELECT * FROM expenses 
                WHERE DATE(created_at) BETWEEN ? AND ? 
                ORDER BY created_at DESC
                `)

            const rows = stmt.all(from, to)
            console.log("rows:", rows);

            return JSON.stringify({
                status: "success",
                rows
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
    }
);