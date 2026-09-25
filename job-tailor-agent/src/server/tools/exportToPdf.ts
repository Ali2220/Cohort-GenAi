// TOOL: export_to_pdf
import { z } from "zod"
import { writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { OUTPUT_DIR } from "../utils/paths.js"
import { wrapText } from "../utils/wrapText.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"

// Input schema
export const exportToPdfSchema = z.object({
    fileName: z.string().describe("File name without extension"),
    content: z.string().describe("The document content"),
})

// Handler function
export async function exportToPdfHandler({
    fileName,
    content,
}: {
    fileName: string
    content: string
}): Promise<CallToolResult> {
    // 1. Sanitize: PDF fonts sirf ASCII samajhte hain
    const safeContent = content
        .replace(/[\u2018\u2019]/g, "'")   // curly single quotes
        .replace(/[\u201C\u201D]/g, '"')   // curly double quotes
        .replace(/[\u2013\u2014]/g, "-")   // en/em dashes
        .replace(/[^\x00-\xFF]/g, "")      // non-Latin characters

    // 2. PDF document setup
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontSize = 11
    const margin = 50

    // 3. Pehla A4 page
    let page = pdfDoc.addPage([595, 842])
    let y = page.getSize().height - margin

    // 4. Har wrapped line draw karein
    for (const line of wrapText(safeContent)) {
        // Page bhar gaya? → naya page
        if (y < margin) {
            page = pdfDoc.addPage([595, 842])
            y = page.getSize().height - margin
        }

        page.drawText(line, {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
        })

        y -= fontSize * 1.4 // line spacing
    }

    // 5. Save karo
    await mkdir(OUTPUT_DIR, { recursive: true })
    const safeName = fileName.replace(/[^a-z0-9-_]/gi, "-")
    const filePath = path.join(OUTPUT_DIR, `${safeName}.pdf`)
    await writeFile(filePath, await pdfDoc.save())

    return {
        content: [{ type: "text", text: `PDF saved: ${filePath}` }],
    }
}