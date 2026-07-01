import { tool } from '@langchain/core/tools'
import dotenv from 'dotenv'
dotenv.config() // Environment variables ko process.env mein load karne ke liye
import { google } from "googleapis"
import { z } from 'zod'

const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
)

oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN as string
})

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

export const sendEmail = tool(
    async ({ to, subject, body, cc }) => {
        try {
            // Standard RFC 2822 format ke mutabiq email ka structure lines ki surat mein taiyar kar rahe hain
            const emailLines = [
                `To: ${to.join(', ')}`, // Multiple recipients ko comma-separated string banata hai
                cc && cc.length > 0 ? `Cc: ${cc.join(', ')}` : '', // Agar CC array maujood ho toh header add karega
                'Content-Type: text/plain; charset="UTF-8"', // Email encoding aur content type specify kar raha hai
                'MIME-Version: 1.0',
                `Subject: ${subject}`,
                '', // RFC standard ke mutabiq headers aur body ke darmiyan aik khali line hona lazmi hai
                body,
            ].filter(Boolean); // .filter(Boolean) empty strings (jaise missing CC) ko array se nikal deta hai

            // Saari lines ko Carriage Return aur Line Feed (\r\n) ke sath join karke raw text block bana rahe hain
            const email = emailLines.join("\r\n")

            // Gmail API raw text accept nahi karti, isliye string ko Base64Url (Web-Safe) format mein encode kar rahe hain
            const encodedEmail = Buffer.from(email)
                .toString("base64")
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const response = await gmail.users.messages.send({
                userId: "me",
                requestBody: {
                    raw: encodedEmail
                }
            })

            return `✅ Email sent!\n📧 To: ${to.join(', ')}\n📋 Subject: ${subject}\n🆔 Message ID: ${response.data.id}`;

        } catch (err: any) {
            return `Error while sending email: ${err.message}`
        }
    },
    {
        name: "send_email",
        description: "Send an email via Gmail API.",
        schema: z.object({
            to: z.array(z.string()).describe('Recipient email addresses'),
            subject: z.string().describe("Email Subject"),
            body: z.string().describe("Email Body"),
            cc: z.array(z.string()).optional().describe("CC email addresses")
        })
    }
)