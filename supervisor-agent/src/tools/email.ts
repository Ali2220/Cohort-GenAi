import { tool } from '@langchain/core/tools'
import dotenv from 'dotenv'
dotenv.config()
import { google } from "googleapis"
import { z } from 'zod'

const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,

)

oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN as string
})

const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

export const sendEmail = tool(
    async ({ to, subject, body, cc }) => {
        try {
            // Create email in RFC 2822 format
            const emailLines = [
                `To: ${to.join(', ')}`,
                cc && cc.length > 0 ? `Cc: ${cc.join(', ')}` : '',
                'Content-Type: text/plain; charset="UTF-8"',
                'MIME-Version: 1.0',
                `Subject: ${subject}`,
                '',
                body,
            ].filter(Boolean);

            const email = emailLines.join("\r\n")
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