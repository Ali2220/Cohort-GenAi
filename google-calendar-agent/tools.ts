import dotenv from 'dotenv'
dotenv.config()
import { tool } from '@langchain/core/tools'
import z from 'zod';
import { google } from 'googleapis'


// Google OAuth2 client ko initialize karna
// Yeh wo "Security Guard" hai jo Google ke sath hamari app ki pehchan karwayega
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,    
    process.env.GOOGLE_CLIENT_SECRET, 
    process.env.GOOGLE_REDIRECT_URI   
);

// Refresh Token set karna (Sab se zaroori step!)
// Iski wajah se humein baar baar browser mein login nahi karna parta. 
// Yeh background mein khud naya access token le aata hai.
oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN as string
});

// Google Calendar API ko initialize karna aur usay apna auth client (guard) de dena
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// TOOL: GET EVENTS tool
export const getEvents = tool(
    async () => {
        try {
            // Google API ko call karke events ki list mangwana
            const response = await calendar.events.list({
                calendarId: 'alisarwar0277@gmail.com', // Jis email ka calendar check karna hai
                timeMin: new Date().toISOString(),     // Sirf abhi se aage ke events laye (purane nahi)
                timeZone: "Asia/karachi",              // Timezone lazmi batana hota hai taake time sahi aaye
            })

            // Response se asal events ka data (array) nikalna
            const events = response.data.items

            // Agar koi event na mile ya array khali ho
            if (!events || events.length === 0) {
                return 'No upcoming events'
            }

            // AI ko poora kachra (raw data) dene ke bajaye, sirf kaam ki cheezein nikal kar clean format banana
            const formattedEvents = events.map((e) => ({
                title: e.summary,                          // Meeting ka naam
                start: e.start?.dateTime || e.start?.date, // Shuru hone ka waqt
                location: e.location || 'No location'      // Jagah (agar set ki gayi ho)
            }))

            // AI tools hamesha string mein jawab mangte hain, isliye JSON ko stringify kar diya
            return JSON.stringify(formattedEvents)

        } catch (error) {
            console.log("Error: ", error);
            return "Failed to fetch calendar events.";
        }
    },
    {
        name: 'get-events', 
        description: 'Call to get the calendar events', 
        schema: z.object({}), 
    }
);

// Create Event tool
export const createEvent = tool(
    async ({ query }) => {

        return 'The meeting has been created'
    },
    {
        name: 'create-event',
        description: 'Call to create the calendar event',
        schema: z.object({
            query: z.string().describe('Query to be used to create the calendar event')
        }),
    }
);