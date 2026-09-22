import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as cheerio from "cheerio";
import { readFile } from "node:fs/promises";
import path from "node:path";

// MCP Server instance
const server = new McpServer({ name: "job-tailor", version: "1.0.0" });

// scrape_job_url tool
server.registerTool(
  "scrape_job_url",
  {
    description:
      "Scrapes a job posting URL and returns the job title and raw content",
    inputSchema: z.object({
      url: z.string().url().describe("The job posting URL to scrape"),
    }),
  },
  async ({ url }) => {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Failed to fetch URL. Status: ${response.status}`,
            },
          ],
          isError: true,
        };
      }

      // Raw HTML lein
      const html = await response.text();

      // Cheerio se HTML parse karein
      const $ = cheerio.load(html);

      // Title nikalein (pehle h1, na mile to <title>)
      const title =
        $("h1").first().text().trim() ||
        $("title").text().trim() ||
        "Unknown Title";

      // Faltu tags hatayein
      $("script, style, nav, footer, header, iframe, noscript").remove();

      // Body text clean karein: spaces collapse + 9000 chars truncate
      const rawText = $("body")
        .text()
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 9000);

      // Structured format mein return karein
      return {
        content: [
          {
            type: "text",
            text: `JOB TITLE: ${title}\nURL: ${url}\n\nRAW CONTENT:\n${rawText}`,
          },
        ],
      };
    } catch (error) {
      // Network error waghera handle karein
      return {
        content: [
          {
            type: "text",
            text: `Error scraping URL: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// process.cwd() = current working directory
// DATA_DIR = C:\Users\dev\Desktop\GenAi-Cohort\job-tailor-agent\data
const DATA_DIR = path.join(process.cwd(), "data");

// this resource read the content of resume from master-resume.md and return to AI
server.registerResource(
  "master_resume",
  "resume://master", // Static URI (fixed address)
  {
    description: "The user's master resume in markdown format",
    mimeType: "text/markdown",
  },
  async (uri) => {
    try {
      // data folder se resume parhein
      const content = await readFile(
        path.join(DATA_DIR, "master-resume.md"),
        "utf-8",
      );

      // Empty file check
      if (!content.trim()) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: "Error: master-resume.md file khali hai! Kuch content likhein.",
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href, // Jo URI request hui
            mimeType: "text/markdown",
            text: content, // Resume ka poora text
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/plain",
            text: `Error reading resume: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  },
);

// this resource read the contact information from contact.json and returns to AI
server.registerResource(
  "contact_info",
  "profile://contact",
  {
    description: "The user's contact information (JSON)",
    mimeType: "application/json",
  },
  async (uri) => {
    const content = await readFile(
      path.join(DATA_DIR, "contact.json"),
      "utf-8",
    );
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: content,
        },
      ],
    };
  },
);

// master resume ko job-data ke mutabiq tailor krne ka prompt.
server.registerPrompt(
  "tailor_resume",
  {
    description: "Prompt to target master resume according to the job data.",
    argsSchema: {
      jobTitle: z.string().optional().describe("The Job title"),
      company: z.string().optional().describe("The company name"),
      topSkills: z
        .string()
        .optional()
        .describe("The top skills required for job"),
    },
  },
  async ({ jobTitle, company, topSkills }) => {
    return {
      messages: [
        {
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
        },
      ],
    };
  },
);

// job-data ke mutabiq aik cover letter likhna ka prompt.
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
      messages: [
        {
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
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Ready");
