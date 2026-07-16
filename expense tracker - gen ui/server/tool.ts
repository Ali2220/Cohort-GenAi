import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { database } from "./agent.js"

export const addExpense = tool(
    ({ title, amount }) => {

        const insert = database.prepare(
            "INSERT INTO expenses (title, amount) VALUES (?, ?)"
        )

        const result = insert.run(title, amount)
        console.log("Inserted expense:", { title, amount, lastInsertRowid: result.lastInsertRowid });

        return JSON.stringify({
            status: "success",
            expenseId: result.lastInsertRowid,
            title,
            amount
        })
    },
    {
        name: "add_expense",
        description: "add expense in DB",
        schema: z.object({
            title: z.string().describe("The title of expense"),
            amount: z.number().describe("The amount spent")
        }),
    }
);