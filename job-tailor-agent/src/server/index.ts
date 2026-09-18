import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import * as cheerio from "cheerio"
import { readFile } from "node:fs/promises"
import path from "node:path"

// MCP Server instance
const server = new McpServer({ name: "job-tailor", version: "1.0.0" })

// scrape_job_url tool
server.registerTool(
    "scrape_job_url",
    {
        description: "Scrapes a job posting URL and returns the job title and raw content",
        inputSchema: z.object({
            url: z.string().url().describe("The job posting URL to scrape")
        })
    },
    async ({ url }) => {
        try {
            const response = await fetch(url)

            if (!response.ok) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Failed to fetch URL. Status: ${response.status}`
                    }],
                    isError: true
                }
            }

            // Raw HTML lein
            const html = await response.text()

            // Cheerio se HTML parse karein
            const $ = cheerio.load(html)

            // Title nikalein (pehle h1, na mile to <title>)
            const title = $("h1").first().text().trim() || $("title").text().trim() || "Unknown Title"

            // Faltu tags hatayein
            $("script, style, nav, footer, header, iframe, noscript").remove()

            // Body text clean karein: spaces collapse + 9000 chars truncate
            const rawText = $("body").text()
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 9000)

            // Structured format mein return karein
            return {
                content: [{
                    type: "text",
                    text: `JOB TITLE: ${title}\nURL: ${url}\n\nRAW CONTENT:\n${rawText}`
                }]
            }
        } catch (error) {
            // Network error waghera handle karein
            return {
                content: [{
                    type: "text",
                    text: `Error scraping URL: ${error instanceof Error ? error.message : "Unknown error"}`
                }],
                isError: true
            }
        }
    }
)

// process.cwd() = current working directory
// DATA_DIR = C:\Users\dev\Desktop\GenAi-Cohort\job-tailor-agent\data
const DATA_DIR = path.join(process.cwd(), "data")

// this resource read the content of resume from master-resume.md and return to AI
server.registerResource(
    "master_resume",
    "resume://master",   // Static URI (fixed address)
    {
        description: "The user's master resume in markdown format",
        mimeType: "text/markdown"
    },
    async (uri) => {
        try {
            // data folder se resume parhein
            const content = await readFile(path.join(DATA_DIR, "master-resume.md"), "utf-8")

            // Empty file check
            if (!content.trim()) {
                return {
                    contents: [{
                        uri: uri.href,
                        mimeType: "text/plain",
                        text: "Error: master-resume.md file khali hai! Kuch content likhein."

                    }]
                }
            }

            return {
                contents: [{
                    uri: uri.href,          // Jo URI request hui
                    mimeType: "text/markdown",
                    text: content           // Resume ka poora text
                }]
            }
        } catch (error) {
            return {
                contents: [{
                    uri: uri.href,
                    mimeType: "text/plain",
                    text: `Error reading resume: ${error instanceof Error ? error.message : "Unknown error"}`
                }]
            }
        }
    }
)

// this resource read the contact information from contact.json and returns to AI
server.registerResource(
    "contact_info",
    "profile://contact",
    {
        description: "The user's contact information (JSON)",
        mimeType: "application/json"
    },
    async (uri) => {
        const content = await readFile(path.join(DATA_DIR, "contact.json"), "utf-8")
        return {
            contents: [{
                uri: uri.href,
                mimeType: "application/json",
                text: content
            }]
        }
    }
)

const transport = new StdioServerTransport()
await server.connect(transport)
console.error("Ready")