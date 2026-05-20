import { tool } from '@langchain/core/tools'
import z from 'zod';

export const createEvent = tool(
    async ({ query }) => {
        return "The event has been created"
    },
    {
        name: 'create-event', // tool ka naam
        description: 'Call to create the calendar event',
        schema: z.object({
            query: z.string().describe("Query of createEvent tool")
        }),
    }
);

export const getEvents = tool(
    async ({ query }) => {
        return JSON.stringify([
            {
                title: 'Meeting with Ali',
                date: '20th May 2026',
                time: '5 PM',
                location: 'Mama chai junction'
            }
        ])
    },
    {
        name: 'get-events',
        description: 'Call to get the calendar events',
        schema: z.object({
            query: z.string().describe("Query of getEvents tool")
        }),
    }
);