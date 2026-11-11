
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const API_URL =
    "https://gen.pollinations.ai/v1/images/edits";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
    try {
        // 1. Get API key
        const apiKey = process.env.POLLINATIONS_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "Pollinations API key is missing" },
                { status: 500 }
            );
        }

        // 2. Receive data from frontend
        const body = await request.json();
        const { imageBase64, prompt } = body ?? {};

        // 3. Validate input
        if (
            typeof imageBase64 !== "string" ||
            typeof prompt !== "string" ||
            !prompt.trim()
        ) {
            return NextResponse.json(
                { error: "Image and prompt are required" },
                { status: 400 }
            );
        }

        if (prompt.length > 2000) {
            return NextResponse.json(
                { error: "Prompt is too long" },
                { status: 400 }
            );
        }

        // 4. Extract MIME type and Base64
        const match = imageBase64.match(
            /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/
        );

        if (!match) {
            return NextResponse.json(
                { error: "Only PNG, JPEG and WebP are supported" },
                { status: 400 }
            );
        }

        const mimeType = match[1];
        const base64Data = match[2];

        // Validate size before decoding
        if (base64Data.length > MAX_IMAGE_SIZE * 1.4) {
            return NextResponse.json(
                { error: "Image must be smaller than 5 MB" },
                { status: 413 }
            );
        }

        // 5. Convert Base64 into binary data
        const imageBuffer = Buffer.from(
            base64Data,
            "base64"
        );


        console.log("Pollinations Request:", {
            prompt: prompt.trim(),
            imageSize: imageBuffer.length,
            imageType: mimeType,
            model: "black-forest-labs/flux.1-kontext-pro",
        });


        if (
            imageBuffer.length === 0 ||
            imageBuffer.length > MAX_IMAGE_SIZE
        ) {
            return NextResponse.json(
                { error: "Invalid image or image too large" },
                { status: 413 }
            );
        }

        // 6. Create multipart FormData
        const formData = new FormData();

        const extension =
            mimeType === "image/jpeg"
                ? "jpg"
                : mimeType === "image/webp"
                    ? "webp"
                    : "png";

        const imageBlob = new Blob(
            [new Uint8Array(imageBuffer)],
            { type: mimeType }
        );

        formData.append(
            "image",
            imageBlob,
            `original.${extension}`
        );

        formData.append("prompt", prompt.trim());

        // Model that supports image editing
        formData.append(
            "model",
            "black-forest-labs/flux.1-kontext-pro"
        );

        formData.append("size", "1024x1024");
        formData.append("response_format", "b64_json");

        // 7. Send request to Pollinations
        const aiResponse = await fetch(API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            body: formData,
            cache: "no-store",
        });

        // 8. Handle API errors
        if (!aiResponse.ok) {
            const details = await aiResponse.text();

            console.error(
                "Pollinations error:",
                aiResponse.status,
                details.slice(0, 500)
            );

            if (aiResponse.status === 402) {
                return NextResponse.json(
                    {
                        error:
                            "Insufficient Pollen credits or model requires paid credits",
                    },
                    { status: 402 }
                );
            }

            if (aiResponse.status === 401) {
                return NextResponse.json(
                    { error: "Invalid Pollinations API key" },
                    { status: 502 }
                );
            }

            if (aiResponse.status === 429) {
                return NextResponse.json(
                    { error: "API rate limit reached" },
                    { status: 429 }
                );
            }

            return NextResponse.json(
                { error: "Pollinations API request failed" },
                { status: 502 }
            );
        }

        // 9. Extract AI-generated image
        const result = await aiResponse.json();

        const editedBase64: string | undefined =
            result.data?.[0]?.b64_json;

        if (!editedBase64) {
            throw new Error("No edited image returned");
        }

        // Some models return JPEG, others PNG/WebP
        const outputMime = editedBase64.startsWith("/9j/")
            ? "image/jpeg"
            : editedBase64.startsWith("UklGR")
                ? "image/webp"
                : "image/png";

        const editedImage =
            `data:${outputMime};base64,${editedBase64}`;

        // 10. Return edited image to frontend
        return NextResponse.json({
            success: true,
            editedImage,
        });

    } catch (error) {
        console.error("Image editing error:", error);

        return NextResponse.json(
            { error: "AI image processing failed" },
            { status: 500 }
        );
    }
}
