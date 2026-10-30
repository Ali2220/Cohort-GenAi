import { NextResponse, NextRequest } from "next/server"

export async function POST(request: Request) {

    const { imageBase64, prompt } = await request.json()
    console.log(imageBase64);
    console.log(prompt);

    // todo:
    // Send the image and prompt to ai-model, and when ai-model gives the response, send it back to frontend.


    return NextResponse.json({ imageBase64, prompt })
}