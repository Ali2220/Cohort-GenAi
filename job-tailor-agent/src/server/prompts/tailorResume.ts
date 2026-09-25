// PROMPT: tailor_resume
import { z } from "zod"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

/**
 * Tailor resume prompt ko server par register karta hai
 */
export function registerTailorResumePrompt(server: McpServer) {
    server.registerPrompt(
        "tailor_resume",
        {
            description: "Prompt to target master resume according to the job data.",
            argsSchema: {
                jobTitle: z.string().optional().describe("The Job title"),
                company: z.string().optional().describe("The company name"),
                topSkills: z.string().optional().describe("The top skills required for job"),
            },
        },
        async ({ jobTitle, company, topSkills }) => {
            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `You are an expert resume writer. Create a tailored resume using the MASTER RESUME from your context.

JOB DATA SOURCE:
- If this conversation already contains job posting data (from scrape_job_url tool), use THAT: its job title, company, and required skills.
- Otherwise, use these provided arguments: Job Title: ${jobTitle ?? "not provided"}, Company: ${company ?? "not provided"}.
${topSkills ? `- Extra skills to emphasize: ${topSkills}` : ""}

Rules:
1. Keep the output in clean Markdown format
2. Reorder and rewrite bullet points to highlight the key skills above
3. Remove experience that is NOT relevant to this role
4. Add a 2-line professional summary at the top targeting this exact role
5. Do NOT invent fake experience - only reshape what exists in the master resume
6. End the document with the user's contact info from context`,
                    },
                }],
            }
        }
    )
}