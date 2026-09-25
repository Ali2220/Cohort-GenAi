// MAIN SERVER - Sab kuch yahan register hota hai
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

// Tools
import { scrapeJobUrlSchema, scrapeJobUrlHandler } from "./tools/scrapeJobUrl.js"
import { saveDocumentSchema, saveDocumentHandler } from "./tools/saveDocument.js"
import { exportToPdfSchema, exportToPdfHandler } from "./tools/exportToPdf.js"

// Resources
import { registerMasterResumeResource } from "./resources/masterResume.js"
import { registerContactInfoResource } from "./resources/contactInfo.js"

// Prompts
import { registerTailorResumePrompt } from "./prompts/tailorResume.js"
import { registerWriteCoverLetterPrompt } from "./prompts/writeCoverLetter.js"

// ==========================================
// Server instance
// ==========================================
export const server = new McpServer({
  name: "job-tailor",
  version: "1.0.0",
})

// ==========================================
// TOOLS REGISTER
// ==========================================
server.registerTool(
  "scrape_job_url",
  {
    description: "Scrapes a job posting URL and returns the job title and raw content",
    inputSchema: scrapeJobUrlSchema,
  },
  scrapeJobUrlHandler
)

server.registerTool(
  "save_document",
  {
    description: "A tool to save the document in .md format",
    inputSchema: saveDocumentSchema,
  },
  saveDocumentHandler
)

server.registerTool(
  "export_to_pdf",
  {
    description: "Converts plain text content into a simple PDF in the output folder",
    inputSchema: exportToPdfSchema,
  },
  exportToPdfHandler
)

// ==========================================
// RESOURCES REGISTER
// ==========================================
registerMasterResumeResource(server)
registerContactInfoResource(server)

// ==========================================
// PROMPTS REGISTER
// ==========================================
registerTailorResumePrompt(server)
registerWriteCoverLetterPrompt(server)