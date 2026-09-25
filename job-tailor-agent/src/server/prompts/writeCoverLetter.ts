// PROMPT: write_cover_letter
import { z } from "zod"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

/**
 * Cover letter prompt ko server par register karta hai
 */
export function registerWriteCoverLetterPrompt(server: McpServer) {
    server.registerPrompt(
        "write_cover_letter",
        {
            description: "The cover_letter for the job",
            argsSchema: {
                jobTitle: z.string().optional().describe("The Job title"),
                company: z.string().optional().describe("The company name"),
                tone: z
                    .enum(["formal", "friendly", "confident"])
                    .optional()
                    .describe("The tone of the cover letter"),
            },
        },
        async ({ jobTitle, company, tone }) => {
            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `You are a career coach. Write a cover letter in a "${tone ?? "professional"}" tone.

JOB DATA SOURCE:
- If this conversation already contains job posting data (from scrape_job_url tool), use THAT for job title and company.
- Otherwise, use these provided arguments: Job Title: ${jobTitle ?? "not provided"}, Company: ${company ?? "not provided"}.

Use the MASTER RESUME and CONTACT INFO from your context.

Structure:
1. Header with user's contact info
2. Opening: why this role and this company excite you
3. Middle: 2 concrete achievements from the resume that match this role
4. Closing: confident call-to-action for an interview
5. Keep it under 350 words`,
                    },
                }],
            }
        }
    )
}