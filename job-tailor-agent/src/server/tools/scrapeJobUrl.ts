// TOOL: scrape_job_url
import { z } from "zod"
import * as cheerio from "cheerio"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"

// Input schema (Zod validation)
export const scrapeJobUrlSchema = z.object({
    url: z.string().url().describe("The job posting URL to scrape"),
})

// Handler function
export async function scrapeJobUrlHandler({ url }: { url: string }): Promise<CallToolResult> {
    try {
        // 1. URL fetch karein
        const response = await fetch(url)

        if (!response.ok) {
            return {
                content: [{
                    type: "text",
                    text: `Error: Failed to fetch URL. Status: ${response.status}`,
                }],
                isError: true,
            }
        }

        // 2. HTML parse karein
        const html = await response.text()
        const $ = cheerio.load(html)

        // 3. Title nikalein
        const title =
            $("h1").first().text().trim() ||
            $("title").text().trim() ||
            "Unknown Title"

        // 4. Faltu tags hatayein
        $("script, style, nav, footer, header, iframe, noscript").remove()

        // 5. Body text clean + truncate
        const rawText = $("body")
            .text()
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 9000)

        // 6. Structured return
        return {
            content: [{
                type: "text",
                text: `JOB TITLE: ${title}\nURL: ${url}\n\nRAW CONTENT:\n${rawText}`,
            }],
        }
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Error scraping URL: ${error instanceof Error ? error.message : "Unknown error"}`,
            }],
            isError: true,
        }
    }
}