import dotenv from "dotenv"
dotenv.config()
import { NextResponse, NextRequest } from "next/server"
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    apiVersion: "v1beta"
})

export async function POST(request: Request) {
    try {
        const { imageBase64, prompt } = await request.json()

        const base64Data = imageBase64.split(",")[1];

        const interaction = await ai.interactions.create({
            // 👇 YE CHANGE KARO - Free Tier compatible
            model: "gemini-2.5-flash-image",
            input: [
                {
                    type: "text",
                    text: prompt
                },
                {
                    type: "image",
                    mime_type: "image/png",
                    data: base64Data
                }
            ]
        })

        const generatedImage = interaction.output_image

        if (!generatedImage || !generatedImage.data) {
            return NextResponse.json(
                { error: "Gemini ne image generate nahi ki!" },
                { status: 500 }
            )
        }

        const resultDataUrl = `data:image/png;base64,${generatedImage.data}`
        console.log("✅ AI Image generated successfully!");

        return NextResponse.json({ imageBase64: resultDataUrl, prompt })

    } catch (error) {
        console.error("❌ Gemini API Error:", error);
        return NextResponse.json(
            { error: "AI processing failed: " + (error as Error).message },
            { status: 500 }
        );
    }
}