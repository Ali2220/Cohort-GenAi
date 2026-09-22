import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as cheerio from "cheerio";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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

// "C:\\Users\\dev\\Desktop\\GenAi-Cohort\\job-tailor-agent\\output"
const OUTPUT_DIR = path.join(process.cwd(), "output");

// wrapText - Lambi lines ko torna
// Input: text (string), maxChars (number, default 95)
// Output: lines (string[]) - array of wrapped lines
function wrapText(text: string, maxChars = 95): string[] {
  // lines: ["Line 1 text", "Line 2 text", "", "Line 4 text"]
  const lines: string[] = [];

  // text ko paragraphs mein split karein (har \n par)
  // paragraph = ek paragraph ka text
  // Shape: "Ye pehla paragraph hai" ya "" (khali)
  for (const paragraph of text.split("\n")) {
    // Agar paragraph khali hai (sirf spaces/newlines)
    if (paragraph.trim() === "") {
      lines.push(""); // Khali line add karo (spacing ke liye)
      continue;
    }

    // current = current line jo hum bana rahe hain
    // Shape: "" → "Hello" → "Hello world" → "Hello world this"
    let current = "";

    // paragraph ko words mein split karein (space se)
    // word = ek word
    // Shape: "Hello", "world", "this", "is", "a", "test"
    for (const word of paragraph.split(" ")) {
      // Check: agar current + space + word milakar maxChars se barh jaye
      if ((current + " " + word).trim().length > maxChars) {
        // Line bhar gayi! Current ko finalize karo
        lines.push(current.trim());
        // Naye word se nayi line shuru karo
        current = word;
      } else {
        // Line abhi bhar nahi, word jor do
        current += " " + word;
      }
    }
    // Paragraph khatam, bachi hui line push karo
    lines.push(current.trim());
  }

  // Final wrapped lines return karo
  // Shape: ["This is a very long", "paragraph that needs", "to be wrapped"]
  return lines;
}

// TOOL: save_document - Markdown file save karna
server.registerTool(
  "save_document",
  {
    description: "A tool to save the document in .md format",
    inputSchema: z.object({
      fileName: z.string().describe("the name of the file without extension"),
      content: z.string().describe("the content of the file"),
    }),
  },
  async ({ fileName, content }) => {
    // OUTPUT_DIR folder banao agar nahi hai
    await mkdir(OUTPUT_DIR, { recursive: true });

    // safeName = file name ko safe banao (special characters → dash)
    // Input: "My Resume: Backend Dev"
    // Output: "My-Resume--Backend-Dev"
    const safeName = fileName.replace(/[^a-z0-9-_]/gi, "-");

    // filePath = complete path with .md extension
    // Shape: "C:\\Users\\dev\\Desktop\\GenAi-Cohort\\job-tailor-agent\\output\\my-resume.md"
    const filePath = path.join(OUTPUT_DIR, `${safeName}.md`);

    // File par content likho
    await writeFile(filePath, content, "utf-8");

    return {
      content: [
        {
          type: "text",
          text: `Saved: ${filePath}`,
        },
      ],
    };
  },
);

// TOOL: export_to_pdf - Text ko PDF banana
server.registerTool(
  "export_to_pdf",
  {
    description:
      "Converts plain text content into a simple PDF in the output folder",
    inputSchema: z.object({
      fileName: z.string().describe("File name without extension"),
      content: z.string().describe("The document content"),
    }),
  },
  async ({ fileName, content }) => {
    // 1. Sanitize: PDF fonts sirf ASCII samajhte hain
    // safeContent = cleaned text jisme curly quotes/dashes/emojis nahi hain
    // Input: "Ali's resume — amazing! 🚀"
    // Output: "Ali's resume - amazing! "
    const safeContent = content
      .replace(/[\u2018\u2019]/g, "'") // curly ' ' → straight '
      .replace(/[\u201C\u201D]/g, '"') // curly " " → straight "
      .replace(/[\u2013\u2014]/g, "-") // en/em dashes → hyphen
      .replace(/[^\x00-\xFF]/g, ""); // non-Latin characters delete

    // 2. Naya PDF document + font setup
    // pdfDoc = khali PDF document object
    const pdfDoc = await PDFDocument.create();

    // font = embedded Helvetica font (basic ASCII font)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // fontSize = 11 points (standard readable size)
    const fontSize = 11;

    // margin = 50 points (page ke charon taraf khali space)
    const margin = 50;

    // 3. Pehla A4 page + starting y position
    // page = A4 size page object (595 × 842 points)
    let page = pdfDoc.addPage([595, 842]);

    // y = vertical position (upar se neeche jata hai)
    // Shape: 792 (842 - 50 margin)
    let y = page.getSize().height - margin;

    // 4. Har wrapped line draw karein
    // wrapText(safeContent) = array of lines
    // line = ek wrapped line ka text
    // Shape: "# Ali Raza", "## Software Engineer", "", "### Skills", "- TypeScript"
    for (const line of wrapText(safeContent)) {
      // Agar y < margin (page bhar gaya, neeche pahunch gaye)
      if (y < margin) {
        // Naya page add karo
        page = pdfDoc.addPage([595, 842]);
        // y ko top par wapas le jao
        y = page.getSize().height - margin;
      }

      // Line draw karo current page par
      page.drawText(line, {
        x: margin, // left se 50 points door
        y, // current vertical position
        size: fontSize, // 11 points
        font, // Helvetica
        color: rgb(0, 0, 0), // black color
      });

      // y ko neeche le jao (next line ke liye)
      // fontSize * 1.4 = line spacing
      y -= fontSize * 1.4;
    }

    // 5. PDF save karo file mein
    await mkdir(OUTPUT_DIR, { recursive: true });

    // safeName = sanitized file name
    // Shape: "my-resume-pdf"
    const safeName = fileName.replace(/[^a-z0-9-_]/gi, "-");

    // filePath = complete path with .pdf extension
    // Shape: "C:\\Users\\dev\\Desktop\\GenAi-Cohort\\job-tailor-agent\\output\\my-resume-pdf.pdf"
    const filePath = path.join(OUTPUT_DIR, `${safeName}.pdf`);

    // pdfDoc.save() = binary data (Uint8Array)
    // writeFile = binary data ko file mein likhna
    await writeFile(filePath, await pdfDoc.save());

    return {
      content: [{ type: "text", text: `PDF saved: ${filePath}` }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Ready");
