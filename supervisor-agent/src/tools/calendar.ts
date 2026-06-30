import { tool } from '@langchain/core/tools'
import dotenv from 'dotenv'
dotenv.config()
import { google } from "googleapis"
import { any, z } from "zod"

// ============================================================================
// 1. OAUTH2 CLIENT & GOOGLE CALENDAR SETUP
// ============================================================================

// Google API client initialize kar rahe hain .env credentials ke sath
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
)

// Refresh token set kar rahe hain taake script ko baar baar manual login na karna pare
// Yeh token offline access ke liye use hota hai
oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN!
})

// Calendar API ka v3 instance create kar rahe hain authorized client ke sath
const calendar = google.calendar({ version: "v3", auth: oauth2Client })


// ============================================================================
// 2. TOOL: CREATE CALENDAR EVENT
// ============================================================================
export const createCalendarEvent = tool(
    async ({ title, startTime, endTime, attendees, location, description }) => {
        try {
            // Event payload prepare kar rahe hain Google Calendar API ke required format mein
            const event = {
                summary: title,
                location: location || undefined,
                description: description || undefined,
                start: {
                    dateTime: startTime,
                    timeZone: 'Asia/Karachi' // TimeZone explicit rakhna zaroori hai warna UTC pick kar lega
                },
                end: {
                    dateTime: endTime,
                    timeZone: 'Asia/Karachi'
                },
                // Zod se aaye hue string array ko Google ke expected object format [{email: "..."}] mein map kar rahe hain
                attendees: attendees?.map((email: string) => ({ email })) || [],
            }

            // 🛠️ FIX: Yahan 'await' zaroori tha taake event successfully save hone ka wait kare
            const response = await calendar.events.insert({
                calendarId: 'primary', // 'primary' ka matlab logged-in user ka apna main calendar
                requestBody: event,
            })

            // Agent ke liye ek clean aur formatted success response return kar rahe hain
            return `✅ Event created!\n📌 Title: ${title}\n🕐 Start: ${startTime}\n🕐 End: ${endTime}\n📍 Location: ${location || 'Not set'}\n`;
        } catch (err: any) {
            // Agar API fail ho, toh throw karne ke bajaye agent ko error string wapas bhejte hain 
            // taake LangGraph loop break na ho aur agent khud error handle kar le
            return `❌ Failed to create event: ${err.message}`;
        }
    },
    {
        name: "create_calendar_event",
        description: "Create a Google Calendar event. Requires ISO datetime format.",
        schema: z.object({
            title: z.string().describe("Event title"),
            startTime: z.string().describe("ISO format: '2026-06-26T14:00:00'"),
            endTime: z.string().describe("ISO format: '2026-06-26T15:00:00'"),
            attendees: z.array(z.string()).optional().describe("Email addresses"),
            location: z.string().optional().describe("Physical location or meeting link"),
            description: z.string().optional().describe("Event description/agenda"),
        })
    }
)


// ============================================================================
// 3. TOOL: GET AVAILABLE TIME SLOTS
// ============================================================================
export const availableTimeSlots = tool(
    async ({ date, durationMinutes }) => {
        try {
            // User ki di hui date ke start (00:00) aur end (23:59) time bounds set kar rahe hain
            const timeMin = `${date}T00:00:00Z`
            const timeMax = `${date}T23:59:59Z`

            // Google ki FreeBusy API call karke check kar rahe hain ke us din kitne events already scheduled hain
            // 🛠️ FIX: Yahan call par direct await laga diya hai clean syntax ke liye
            const response = await calendar.freebusy.query({
                requestBody: {
                    timeMin,
                    timeMax,
                    timeZone: "Asia/Karachi",
                    items: [{ id: "primary" }] // Jis calendar ki availability check karni hai
                }
            })

            // API se booked time slots ka array nikal rahe hain (agar empty ho toh empty array [])
            const busySlots = response.data.calendars?.primary?.busy || []

            // Yeh hamare business hours ya possible meeting slots hain jin mein se hum free time nikalenge
            const freeSlots = ["09:00", "10:00", "11:00", "14:00", "15:00"]

            // Busy slots ke objects mein se sirf start time ko "HH:MM" format mein extract kar rahe hain
            const busyTimes = busySlots.map(b => new Date(b.start!).toISOString().split("T")[1]?.substring(0, 5))

            // Un slots ko filter kar rahe hain jo busyTimes ke array mein maujood NAHI hain
            const available = freeSlots.filter(t => !busyTimes.includes(t))

            // Agent ko conditionally batate hain ke slots bache hain ya din completely book hai
            return available.length > 0
                ? `Available slots on ${date}: ${available.join(', ')}`
                : `No free slots on ${date}. User is fully booked.`;
        } catch (err: any) {
            return `❌ Failed to check availability: ${err.message}`
        }
    },
    {
        name: "get_available_time_slots",
        description: "Check Google Calendar availability for a specific date.",
        schema: z.object({
            date: z.string().describe("ISO date: '2026-06-26'"),
            durationMinutes: z.number().default(60), // Abhi ke liye logic mein use nahi ho raha, par schema mein hai
        }),
    }
)