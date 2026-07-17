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

            console.log("Inserted expense:", {
                title,
                amount,
                lastInsertRowid: result.lastInsertRowid,
            });

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