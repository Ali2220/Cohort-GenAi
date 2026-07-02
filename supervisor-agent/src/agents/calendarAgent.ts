import { ToolNode } from "@langchain/langgraph/prebuilt"
import { createCalendarEvent, availableTimeSlots } from "../tools/calendar.ts"
import { model } from '../model.ts'

const calendarTools = [createCalendarEvent, availableTimeSlots]
const toolNode = new ToolNode(calendarTools)

// MAIN CALENDAR AGENT (Node)
export async function calendarAgent(state: any) {

    const SYSTEM_PROMPT = `You are a calendar scheduling assistant.
Parse natural language scheduling requests into proper ISO datetime formats.
Use get_available_time_slots to check availability when needed.
Use create_calendar_event to schedule events.
Always confirm what was scheduled in your final response.

Current date: ${new Date().toISOString().split('T')[0]}`;

    const llmWithTools = model.bindTools(calendarTools)

    const response = await llmWithTools.invoke([
        {
            role: 'system',
            content: SYSTEM_PROMPT
        },
        ...state.messages // Spread operator se purane saare messages list mein expand ho jayenge
    ])

    // Agar model ne faisla kiya ke use direct jawab dene ke bajaye tool chalana hai
    if (response.tool_calls?.length) {

        // ToolNode ko invoke kar rahe hain jo real backend API call execute karega
        const toolResults = await toolNode.invoke({
            messages: [response]
        })

        // Tool ka result aane ke baad, model ko dobara call kar rahe hain final answer ke liye
        const finalResponse = await model.invoke([
            {
                role: "system",
                content: SYSTEM_PROMPT,
            },
            ...state.messages,         // User ki original request/history
            response,                 // LLM ka apna pehla decision (tool call)
            ...toolResults.messages   // Tool execution ka actual result/output
        ])

        // LangGraph ki state memory ko final answer ke sath update kar rahe hain
        return {
            messages: [finalResponse]
        }
    }

    // Agar user ne koi aisi baat ki jisme tool ki zaroorat nahi thi (e.g. "Hi"), toh direct wahi response return kar rahe hain
    return {
        messages: [response]
    }
}