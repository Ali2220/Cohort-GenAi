import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

// image-editing model of cloudflare workers ai
const MODEL_ID = "@cf/black-forest-labs/flux-2-klein-4b";

// Maximum uploaded image size 5 MB hogi.
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Cloudflare ki reference image 512x512 se chhoti honi chahiye.
const MAX_INPUT_WIDTH = 511;
const MAX_INPUT_HEIGHT = 511;

// Generated image ki output resolution.
// 512x512 rakhi hai taake free quota kam consume ho.
const OUTPUT_WIDTH = 512;
const OUTPUT_HEIGHT = 512;

export async function POST(request: Request) {
  try {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!apiToken || !accountId) {
      return NextResponse.json(
        {
          error: "Cloudflare API token or Account ID is missing",
        },
        { status: 500 },
      );
    }

    const API_URL = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL_ID}`;

    // Frontend se image aur prompt receive karo.
    const body = await request.json();

    const { imageBase64, prompt } = body ?? {};

    if (
      typeof imageBase64 !== "string" ||
      typeof prompt !== "string" ||
      !prompt.trim()
    ) {
      return NextResponse.json(
        { error: "Image and prompt are required" },
        { status: 400 },
      );
    }

    if (prompt.length > 2000) {
      return NextResponse.json(
        { error: "Prompt is too long" },
        { status: 400 },
      );
    }

    // DATA URL SE BASE64 EXTRACT KARO
    // Sirf PNG, JPEG aur WebP formats accept honge.
    // Example:
    // data:image/png;base64,iVBORw0KGgo...
    const match = imageBase64.match(
      /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/,
    );

    // Agar regex match nahi hui to format invalid hai.
    if (!match) {
      return NextResponse.json(
        { error: "Only PNG, JPEG and WebP are supported" },
        { status: 400 },
      );
    }

    // match[1] = Original image ka MIME type.
    // match[2] = Sirf Base64 encoded image data.
    const base64Data = match[2];

    // Base64 decode karne se pehle size check karo.
    // Base64 encoding image ka size taqreeban 33% barha deti hai.
    if (base64Data.length > MAX_IMAGE_SIZE * 1.4) {
      return NextResponse.json(
        { error: "Image must be smaller than 5 MB" },
        { status: 413 },
      );
    }

    // BASE64 KO BUFFER MEIN CONVERT KARO
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Image ka actual binary size check karo.
    if (imageBuffer.length === 0) {
      return NextResponse.json(
        { error: "Image is empty or invalid" },
        { status: 400 },
      );
    }

    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Image must be smaller than 5 MB" },
        { status: 413 },
      );
    }

    // SHARP SE IMAGE RESIZE KARO
    // Cloudflare ko reference image 512x512 se
    // chhoti chahiye, isliye image resize karenge.

    let resizedBuffer: Buffer;

    try {
      resizedBuffer = await sharp(imageBuffer, {
        // Bohat bari pixel resolution wali images
        // ko process karne se rokne ke liye limit.
        limitInputPixels: 40_000_000,
      })
        // Mobile camera images ki orientation correct karo.
        .rotate()

        .resize({
          width: MAX_INPUT_WIDTH,
          height: MAX_INPUT_HEIGHT,

          // Aspect ratio preserve rahega.
          // Image stretch ya distort nahi hogi.
          fit: "inside",

          // Agar image pehle se chhoti hai
          // to usko unnecessarily bara nahi karenge.
          withoutEnlargement: true,
        })

        // Har processed image ko PNG mein convert karo.
        // Isse Blob ka MIME type consistent rahega.
        .png()

        // IMPORTANT:
        // Sharp pipeline ko execute karke
        // actual processed Buffer receive karo.
        .toBuffer();
    } catch (error) {
      console.error("Image resizing failed:", error);

      return NextResponse.json(
        { error: "Invalid image or image resizing failed" },
        { status: 400 },
      );
    }

    // RESIZED BUFFER KO BLOB MEIN CONVERT KARO
    const imageBlob = new Blob([new Uint8Array(resizedBuffer)], {
      type: "image/png",
    });

    // CLOUDFLARE FORMDATA PREPARE KARO
    const formData = new FormData();

    formData.append("input_image_0", imageBlob, "original.png");

    // User ka editing prompt add karo.
    formData.append("prompt", prompt.trim());

    // FormData text values string mein leta hai,
    // isliye numbers ko String() se convert karenge.
    formData.append("width", String(OUTPUT_WIDTH));
    formData.append("height", String(OUTPUT_HEIGHT));

    // CLOUDFLARE API REQUEST
    const aiResponse = await fetch(API_URL, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${apiToken}`,
      },

      // Image, prompt, width aur height send karo.
      body: formData,

      // Har request ka fresh response chahiye.
      cache: "no-store",
    });

    // Expected response:
    // {
    //   success: true,
    //   errors: [],
    //   result: {
    //     image: "iVBORw0KGgo..."
    //   }
    // }
    const result = await aiResponse.json().catch(() => null);

    if (!aiResponse.ok || result?.success !== true) {
      // Cloudflare ke internal error codes access karo.
      const errorCodes: number[] = Array.isArray(result?.errors)
        ? result.errors.map((error: { code: number }) => error.code)
        : [];

      console.error("Cloudflare API error:", {
        status: aiResponse.status,
        errors: result?.errors,
      });

      // 3036 = Daily free Neurons allocation khatam.
      if (errorCodes.includes(3036)) {
        return NextResponse.json(
          {
            error: "Daily free AI quota exhausted. Try again after reset.",
          },
          { status: 429 },
        );
      }

      // 5035 = Model Workers Paid plan require karta hai.
      if (errorCodes.includes(5035)) {
        return NextResponse.json(
          {
            error: "This model requires a Cloudflare paid plan",
          },
          { status: 403 },
        );
      }

      // 401 = Authentication error.
      if (aiResponse.status === 401) {
        return NextResponse.json(
          { error: "Invalid Cloudflare API token" },
          { status: 502 },
        );
      }

      // 403 = Token permissions ya account access issue.
      if (aiResponse.status === 403) {
        return NextResponse.json(
          { error: "Cloudflare API permission denied" },
          { status: 502 },
        );
      }

      // 429 = Rate limit ya temporary model capacity issue.
      if (aiResponse.status === 429) {
        return NextResponse.json(
          {
            error: "Cloudflare rate limit or capacity limit reached",
          },
          { status: 429 },
        );
      }

      // 400 = Request fields ya image input invalid hai.
      if (aiResponse.status === 400) {
        return NextResponse.json(
          { error: "Invalid Cloudflare image editing request" },
          { status: 400 },
        );
      }

      // 413 = Request ka size limit se zyada hai.
      if (aiResponse.status === 413) {
        return NextResponse.json(
          { error: "Cloudflare request is too large" },
          { status: 413 },
        );
      }

      // Baqi unexpected upstream errors.
      return NextResponse.json(
        { error: "Cloudflare AI request failed" },
        { status: 502 },
      );
    }

    const editedBase64 = result.result?.image;

    // Check karo edited image valid string hai.
    if (typeof editedBase64 !== "string" || !editedBase64.trim()) {
      return NextResponse.json(
        { error: "No edited image returned by Cloudflare" },
        { status: 502 },
      );
    }

    let outputMime: string;

    try {
      // AI ke Base64 output ko Buffer mein convert karo.
      const outputBuffer = Buffer.from(editedBase64, "base64");

      // Sharp metadata se actual image format pata karo.
      const metadata = await sharp(outputBuffer).metadata();

      switch (metadata.format) {
        case "jpeg":
          outputMime = "image/jpeg";
          break;

        case "png":
          outputMime = "image/png";
          break;

        case "webp":
          outputMime = "image/webp";
          break;

        default:
          throw new Error("Unsupported output image format");
      }
    } catch (error) {
      console.error("Invalid Cloudflare image output:", error);

      return NextResponse.json(
        { error: "Cloudflare returned an invalid image" },
        { status: 502 },
      );
    }

    // BASE64 KO DATA URL MEIN CONVERT KARO
    const editedImage = `data:${outputMime};base64,${editedBase64}`;

    return NextResponse.json({
      success: true,
      editedImage,
    });
  } catch (error) {
    // Unexpected server ya network errors handle karo.
    console.error("Image editing error:", error);

    return NextResponse.json(
      { error: "AI image processing failed" },
      { status: 500 },
    );
  }
}
