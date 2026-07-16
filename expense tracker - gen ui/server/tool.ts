import { tool } from "@langchain/core/tools";
import * as z from "zod";

export const addExpense = tool(
    ({ title, amount }) => {

        console.log({ title, amount });

        return JSON.stringify({ status: "success" })
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