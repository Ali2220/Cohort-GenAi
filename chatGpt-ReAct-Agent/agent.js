import dotenv from 'dotenv'
dotenv.config()
import { ChatGroq } from '@langchain/groq'
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { TavilySearch } from "@langchain/tavily";
import { tool } from '@langchain/core/tools';
import * as z from "zod";

async function main() {

    // STEP 1: LLM (Brain) Setup
    const model = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: "openai/gpt-oss-120b",
        temperature: 0,
    });

    // STEP 2: Tools (Hands) Setup
    const search = new TavilySearch({
        maxResults: 3,
        topic: "general",
    });

    // Custom Calendar Tool: 
    const myEvents = [
        { date: "2026-05-12", event: "AI Workshop at 10:00 AM" },
        { date: "2026-05-13", event: "Meeting with Client at 2:00 PM" },
        { date: "2026-05-15", event: "Exam Submission Deadline" }
    ]

    // tool function ke andar hum ek function dete hain, and aik object dete hain.
    const calendarTool = tool(
        async ({ date }) => {
            console.log(`Checking calendar for: ${date}`);
            const eventFound = myEvents.find(e => e.date === date)
            return eventFound ? eventFound.event : "No events found for this date. You are free!";

        },
        {
            name: "check_calendar",
            description: "Use this tool to check for meetings, events, or deadlines on a specific date (format: YYYY-MM-DD).",
            schema: z.object({
                date: z.string().describe("The date to check in YYYY-MM-DD format."),
            }),
        }
    );

    // STEP 3: Agent Creation
    // createReactAgent LLM aur Tools ko apas mein jorta hai.
    // Ye background mein ek "Reasoning" aur "Action" loop (ReAct) chalata hai.
    const agent = createReactAgent({
        llm: model,
        tools: [search, calendarTool],
    })

    // STEP 4: Invocation (Sawal Poochna)
    const result = await agent.invoke({
        messages: [
            {
                role: "system",
                content: `You are a helpful assistant. Use provided tools (search, calendarTool) if needed, else directly answer me if you have the information.
                Date: ${new Date().toUTCString()}
                `
            },
            {
                role: "human",
                content: "Do I have meeting tomorrow ?"
            }
        ]
    })

    // Hum sirf aakhri message (Assistant ka final answer) print kar rahe hain.
    console.log(result.messages[result.messages.length - 1].content);
}

main()