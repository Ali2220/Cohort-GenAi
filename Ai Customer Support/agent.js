import dotenv from 'dotenv'
dotenv.config()
import { ChatGroq } from "@langchain/groq"
import { createReactAgent } from "@langchain/langgraph/prebuilt"
import { MemorySaver } from "@langchain/langgraph"
import { tool } from "@langchain/core/tools"
import * as z from "zod";

const model = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "openai/gpt-oss-120b",
    temperature: 0
})

const memory = new MemorySaver()

const inventory = [
    { item: "denim jacket", stock: 5, price: "Rs. 4500" },
    { item: "khaddi kurta", stock: 0, price: "Rs. 3200" },
    { item: "ajrak", stock: 12, price: "Rs. 1500" }
]

const orders = [
    { id: "101", status: "Shipped", delivery: "Tomorrow" },
    { id: "102", status: "Processing", delivery: "3 days" }
]

// Tools
const checkInventory = tool(
    async ({ item }) => {
        // Agar "all" ya khaali string bheje, to poori list dikhao
        if (item.toLowerCase() === "all" || item.trim() === "") {
            const itemsList = inventory
                .map(i => `${i.item}: ${i.stock > 0 ? i.stock + ' in stock, ' + i.price : 'Out of stock'}`)
                .join('\n');
            return `Hamari inventory:\n${itemsList}`;
        }

        const product = inventory.find((i) => i.item.toLowerCase().includes(item.toLowerCase()))
        if (!product) return "Sorry! ye product humare pass nhi hai."

        return product.stock > 0 ? `${product.item} stock mein hai. Price: ${product.price}` : `${product.item} khatam ho gya hai. (Out of stock)`
    },
    {
        name: "checkInventory",
        description: "check the inventory",
        schema: z.object({
            item: z.string().describe('Name of an inventory item.')
        })
    }
)

const traceOrder = tool(
    async ({ id }) => {
        const order = orders.find(i => i.id === id)
        return order ? `Order #${order.id} status: ${order.status} delivery: ${order.delivery}` : "Invalid Order Id"
    },
    {
        name: 'traceOrder',
        description: "trace the order using orderId",
        schema: z.object({
            id: z.string().describe("The id of a specific order")
        })
    }
)

export const agent = createReactAgent({
    llm: model,
    tools: [checkInventory, traceOrder],
    checkpointer: memory
})

