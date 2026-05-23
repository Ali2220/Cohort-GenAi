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
      // AI se aane wale simple email strings ko Google ke expected format [{ email: '...' }] mein convert karna
      const formattedAttendees = attendees
        ? attendees.map((email) => ({ email: email }))
        : undefined;

      const event = {
        summary: summary,
        location: location,
        start: { dateTime: startTime, timeZone: "Asia/Karachi" },
        end: { dateTime: endTime, timeZone: "Asia/Karachi" },
        attendees: formattedAttendees,
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`, // Ek unique string hona zaroori hai
            conferenceSolutionKey: { type: "hangoutsMeet" }, // 'hangoutsMeet' se Google Meet link banta hai
          },
        },
      };

      const response = await calendar.events.insert({
        calendarId: "primary",
        sendUpdates: "all",
        conferenceDataVersion: 1,
        requestBody: event,
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
      // Zod schema mein array of strings add kar diya jo optional hai
      attendees: z
        .array(z.string())
        .optional()
        .describe("Array of attendee emails (e.g., ['guest@example.com'])"),
    }),
  },
);
