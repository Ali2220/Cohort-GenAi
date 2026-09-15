import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import * as cheerio from "cheerio"

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

            // Body text clean karein: spaces collapse + 8000 chars truncate
            const rawText = $("body").text()
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 8000)

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

const transport = new StdioServerTransport()
await server.connect(transport)
console.error("Ready")