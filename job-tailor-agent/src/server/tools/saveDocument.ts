// TOOL: save_document
import { z } from "zod"
import { writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { OUTPUT_DIR } from "../utils/paths.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"

// Input schema
export const saveDocumentSchema = z.object({
    fileName: z.string().describe("The name of the file without extension"),
    content: z.string().describe("The content of the file"),
})

// Handler function
export async function saveDocumentHandler({
    fileName,
    content,
}: {
    fileName: string
    content: string
}): Promise<CallToolResult> {
    // Output folder ensure karein
    await mkdir(OUTPUT_DIR, { recursive: true })

    // File name safe banao (special characters → dash)
    const safeName = fileName.replace(/[^a-z0-9-_]/gi, "-")
    const filePath = path.join(OUTPUT_DIR, `${safeName}.md`)

    // File likho
    await writeFile(filePath, content, "utf-8")

    return {
        content: [{
            type: "text",
            text: `Saved: ${filePath}`,
        }],
    }
}