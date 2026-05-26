import dotenv from "dotenv";
dotenv.config();
import { tool } from "@langchain/core/tools";
import z from "zod";
import { google } from "googleapis";

// Google OAuth2 client ko initialize karna
// Yeh wo "Security Guard" hai jo Google ke sath hamari app ki pehchan karwayega
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
);

// Refresh Token set karna (Sab se zaroori step!)
// Iski wajah se humein baar baar browser mein login nahi karna parta.
// Yeh background mein khud naya access token le aata hai.
oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN as string,
});

// Google Calendar API ko initialize karna aur usay apna auth client (guard) de dena
const calendar = google.calendar({ version: "v3", auth: oauth2Client });

// TOOL: GET EVENTS tool
export const getEvents = tool(
    async () => {
        try {
            // Google API ko call karke events ki list mangwana
            const response = await calendar.events.list({
                calendarId: "alisarwar0277@gmail.com", // Jis email ka calendar check karna hai
                timeMin: new Date().toISOString(), // Sirf abhi se aage ke events laye (purane nahi)
                timeZone: "Asia/karachi", // Timezone lazmi batana hota hai taake time sahi aaye
            });

            // Response se asal events ka data (array) nikalna
            const events = response.data.items;

            // Agar koi event na mile ya array khali ho
            if (!events || events.length === 0) {
                return "No upcoming events";
            }

            // AI ko poora kachra (raw data) dene ke bajaye, sirf kaam ki cheezein nikal kar clean format banana
            const formattedEvents = events.map((e) => ({
                id: e.id,
                title: e.summary, // Meeting ka naam
                start: e.start?.dateTime || e.start?.date, // Shuru hone ka waqt
                location: e.location || "No location", // Jagah (agar set ki gayi ho)
            }));

            // AI tools hamesha string mein jawab mangte hain, isliye JSON ko stringify kar diya
            return JSON.stringify(formattedEvents);
        } catch (error) {
            console.log("Error: ", error);
            return "Failed to fetch calendar events.";
        }
    },
    {
        name: "get-events",
        description: "Call to get the calendar events",
        schema: z.object({}),
    },
);

// Create Event tool
export const createEvent = tool(
    async ({ summary, location, startTime, endTime, attendees }) => {
        try {
            // 1. DATA MAPPING: AI se aane wale simple email arrays (e.g., ['umer@gmail.com']) ko
            // Google ke expected format [{ email: 'umer@gmail.com' }] mein convert karna.
            // Agar attendees nahi bheje gaye, to isay undefined chor dein ge.
            const formattedAttendees = attendees
                ? attendees.map((email) => ({ email: email }))
                : undefined;

            // 2. REQUEST BODY: Google Calendar API ke mutabiq event ka poora structure (object) taiyar karna
            const event = {
                summary: summary, // Meeting ka title ya topic
                location: location, // Meeting ki jagah (agar physical location ho)
                // Shuru hone ka waqt aur local timezone setting
                start: { dateTime: startTime, timeZone: "Asia/Karachi" },
                // Khatam hone ka waqt aur local timezone setting
                end: { dateTime: endTime, timeZone: "Asia/Karachi" },
                attendees: formattedAttendees, // Tayyar kiye gaye guests ki list

                // 3. GOOGLE MEET SETUP: Google Meet link generate karne ki request dalna
                conferenceData: {
                    createRequest: {
                        requestId: `meet-${Date.now()}`, // Har meeting ke liye ek unique string hona zaroori hai (isliye timestamp lagaya)
                        conferenceSolutionKey: { type: "hangoutsMeet" }, // 'hangoutsMeet' batata hai ke humein Google Meet ka link chahiye
                    },
                },
            };

            // 4. API CALL: Google Calendar API ko request bhejna event insert karne ke liye
            const response = await calendar.events.insert({
                calendarId: "primary", // User ka main default calendar select kiya hai
                sendUpdates: "all", // Sabhi attendees/guests ko automatic email invitation aur links chale jayein
                conferenceDataVersion: 1, // Isay '1' rakhna lazmi hai taake upar wala Google Meet ka link ban sake
                requestBody: event, // Jo event object humne upar banaya tha wo yahan pass kar diya
            });

            return `Event created successfully!`;
        } catch (error) {
            console.error("Error creating event:", error);
            return "Failed to create event. Please check permissions or data format.";
        }
    },
    {
        name: "create-event",
        description:
            "Call to create a new calendar event or meeting. You MUST provide startTime and endTime in strict ISO format.",

        // VALIDATION SCHEMA: Yeh Zod schema AI ko strict limits deta hai ke user ki chat se kya data nikal kar tool ko bhejna hai
        schema: z.object({
            summary: z
                .string()
                .describe("Title of the meeting or event (e.g., 'Meeting with Umer')"),
            location: z
                .string()
                .optional()
                .describe("Location of the meeting (e.g., 'Johar')"),
            startTime: z
                .string()
                .describe(
                    "Start time strictly in local ISO format with Karachi offset (e.g., '2026-05-24T17:00:00+05:00') or without any timezone letter at the end (e.g., '2026-05-24T17:00:00'). DO NOT append 'Z'.",
                ),
            endTime: z
                .string()
                .describe(
                    "End time strictly in local ISO format with Karachi offset (e.g., '2026-05-24T18:00:00+05:00') or without any timezone letter at the end. DO NOT append 'Z'.",
                ),
            attendees: z
                .array(z.string())
                .optional()
                .describe("Array of attendee emails (e.g., ['guest@example.com'])"),
        }),
    },
);

// Delete Event tool
export const deleteEvent = tool(
    async ({ eventId }) => {
        await calendar.events.delete({
            calendarId: 'alisarwar0277@gmail.com',
            eventId: eventId,
            sendUpdates: 'all'
        })

        return `Event deleted successfully.`
    },
    {
        name: 'delete-event',
        description: "Call to delete an existing calendar event. You MUST provide the exact eventId. If you don't know the eventId, call 'get-events' first to find it.",
        schema: z.object({
            eventId: z.string().describe("The unique ID of the event to delete (e.g., 'a1b2c3d4e5f6g7h8')")
        })
    }
)

// Update event tool
export const updateEvent = tool(
    async ({ eventId, summary, location, startTime, endTime, attendees }) => {
        try {
            // 1. Agar nayi email list aayi hai, to usko format karein
            const formattedAttendees = attendees
                ? attendees.map((email) => ({ email: email }))
                : undefined;

            // 2. Sirf wahi cheezein update object mein dalein jo AI ne bheji hain (Partial Update)
            // Is se yeh faida hoga ke jo cheez change nahi karni, wo Google Calendar mein mehfooz rahegi
            const eventPatch: any = {};

            if (summary) eventPatch.summary = summary;
            if (location) eventPatch.location = location;
            if (startTime) eventPatch.start = { dateTime: startTime, timeZone: "Asia/Karachi" };
            if (endTime) eventPatch.end = { dateTime: endTime, timeZone: "Asia/Karachi" };
            if (formattedAttendees) eventPatch.attendees = formattedAttendees; // Note: Ye purane guests ko replace kar dega

            // 3. API Call: Google Calendar .patch method
            await calendar.events.patch({
                calendarId: "primary", // Ya "alisarwar0277@gmail.com"
                eventId: eventId,      // Wo ID jo AI ne getEvents se nikali hogi
                sendUpdates: "all",    // Taa ke guests ko updated time/location ki email mil jaye
                requestBody: eventPatch, // Sirf changes wala object pass kiya
            });

            return `Event updated successfully!`;
        }
        catch (error) {
            console.error("Error updating event:", error);
            return "Failed to update event. Please check event ID or data format.";
        }
    },
    {
        name: 'update-event',
        description: "Call to update or reschedule an existing calendar event. You MUST provide the exact eventId. If you don't know the eventId, call 'get-events' first to find it. Only provide the fields that need to be changed.",
        schema: z.object({
            eventId: z
                .string()
                .describe("The unique ID of the event to update (e.g., 'a1b2c3d4e5f6g7h8')"),
            summary: z
                .string()
                .optional()
                .describe("New title of the meeting or event"),
            location: z
                .string()
                .optional()
                .describe("New location of the meeting"),
            startTime: z
                .string()
                .optional()
                .describe(
                    "New start time strictly in local ISO format with Karachi offset (e.g., '2026-05-24T17:00:00+05:00') or without any timezone letter at the end. DO NOT append 'Z'."
                ),
            endTime: z
                .string()
                .optional()
                .describe(
                    "New end time strictly in local ISO format with Karachi offset. DO NOT append 'Z'."
                ),
            attendees: z
                .array(z.string())
                .optional()
                .describe("New array of attendee emails. WARNING: This will overwrite the existing attendees list."),
        })
    }
)