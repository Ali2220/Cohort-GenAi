import dotenv from "dotenv"
dotenv.config()
import Tesseract from "tesseract.js"
import { ChatGroq } from "@langchain/groq"

const model = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0,
    apiKey: process.env.GROQ_API_KEY as string
})

export async function scanReceipt(imageBase64: string) {
    try {
        const base64Clean = imageBase64.replace(/^data:image\/\w+;base64,/, "")

        const {
            data: { text }
        } = await Tesseract.recognize(Buffer.from(base64Clean, "base64"), "eng")

        const today = new Date().toISOString().slice(0, 10)

        const extraction = await model.invoke([
            {
                role: "system",
                content: `You are a receipt parsing expert. Extract clean structured data from messy OCR text.

Rules:
- amount: number only, no currency symbols. Pick the TOTAL/FINAL amount if multiple exist.
- title: merchant name or short description (max 3 words)
- category: pick ONE from [food, transport, shopping, bills, entertainment, health, groceries, other]
- date: YYYY-MM-DD format. If unclear, use ${today}
- confidence: "high" | "medium" | "low" based on text clarity

Return ONLY valid JSON. No markdown, no explanation.`
            }
        ])

        const content = extraction.content as string
        const jsonMatch = content.match(/\{[\s\S]*?\}/)

        const extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : null

        return {
            success: true,
            rawText: text,
            extracted: extracted || {
                amount: 0,
                title: "Unknown",
                category: "other",
                date: today,
                confidence: "low",
            },
        }
    } catch (err) {

    }
}