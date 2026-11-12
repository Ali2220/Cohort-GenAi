import { NextResponse } from "next/server";

// RUNTIME CONFIG
// "nodejs" = Node.js environment use karo (Edge runtime nahi)
// Kyun zaroori? Kyunke hum Buffer use kar rahe hain
// Buffer sirf Node.js mein available hai, Edge runtime mein nahi
export const runtime = "nodejs";

// POLLINATIONS API ENDPOINT
// /v1/images/edits = Image EDITING endpoint (image + prompt leta hai)
const API_URL = "https://gen.pollinations.ai/v1/images/edits";

// 5 MB limit = 5 * 1024 KB * 1024 bytes = 5,242,880 bytes
// Bari images server ki memory bhar deti hain, isliye limit zaroori
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  try {
    const apiKey = process.env.POLLINATIONS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Pollinations API key is missing" },
        { status: 500 }, // 500 = Internal Server Error
      );
    }

    // FRONTEND SE DATA RECEIVE KARO
    // Frontend ne bheja tha: { imageBase64: "data:image/png;base64,...", prompt: "..." }
    const body = await request.json();

    const { imageBase64, prompt } = body ?? {};

    if (
      typeof imageBase64 !== "string" ||
      typeof prompt !== "string" ||
      !prompt.trim()
    ) {
      return NextResponse.json(
        { error: "Image and prompt are required" },
        { status: 400 }, // 400 = Bad Request (client ki ghalti)
      );
    }

    if (prompt.length > 2000) {
      return NextResponse.json(
        { error: "Prompt is too long" },
        { status: 400 },
      );
    }

    // DATA URL KO TODDO (MIME + Base64)
    // Input: "data:image/png;base64,iVBORw0KGgo..."
    // Regex breakdown:
    //   ^data:              → string "data:" se shuru ho
    //   (image\/(?:png|jpeg|webp)) → GROUP 1: sirf ye 3 formats allow
    //   ;base64,            → literal ";base64,"
    //   ([A-Za-z0-9+/=]+)   → GROUP 2: valid Base64 characters
    //   $                   → string yahan khatam ho
    const match = imageBase64.match(
      /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/,
    );

    // Agar regex match nahi hua → format galat hai (GIF, SVG, etc.)
    if (!match) {
      return NextResponse.json(
        { error: "Only PNG, JPEG and WebP are supported" },
        { status: 400 },
      );
    }

    // match[0] = poora matched string
    // match[1] = pehla capture group = MIME type ("image/png")
    // match[2] = doosra capture group = sirf Base64 data ("iVBORw0...")
    const mimeType = match[1];
    const base64Data = match[2];

    // SIZE CHECK (DECODE SE PEHLE!)
    // Base64 encoding data ko ~33% bara kar deti hai
    // Isliye: 5MB binary ≈ 6.67MB Base64 (5 * 1.33)
    // 1.4 factor = thora safety margin
    if (base64Data.length > MAX_IMAGE_SIZE * 1.4) {
      return NextResponse.json(
        { error: "Image must be smaller than 5 MB" },
        { status: 413 }, // 413 = Payload Too Large
      );
    }

    // BASE64 → BINARY BUFFER
    // Buffer.from(string, "base64") = Base64 string ko asli binary bytes mein convert
    // Input:  "iVBORw0KGgo..."  (text string)
    // Output: <Buffer 89 50 4e 47 0d 0a...>  (actual image bytes)
    //
    // Kyun? Pollinations ko asli file chahiye, text string nahi
    const imageBuffer = Buffer.from(base64Data, "base64");

    // FINAL SIZE VALIDATION
    // length === 0 → corrupt/empty image
    // length > MAX → 5MB se bari (exact check, estimate nahi)
    if (imageBuffer.length === 0 || imageBuffer.length > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Invalid image or image too large" },
        { status: 413 },
      );
    }

    // MULTIPART FORMDATA BANAO
    // Pollinations ka /edits endpoint FormData mangta hai (JSON nahi)
    // FormData = container jo text + files ek sath pack karta hai
    const formData = new FormData();

    // MIME type se file extension decide karo
    // "image/jpeg" → "jpg", "image/webp" → "webp", warna "png"
    // Nested ternary: condition ? true : (condition ? true : false)
    const extension =
      mimeType === "image/jpeg"
        ? "jpg"
        : mimeType === "image/webp"
          ? "webp"
          : "png";

    // BUFFER → BLOB CONVERSION
    // Blob = "Binary Large Object" = browser/Node ka file representation
    // new Uint8Array(imageBuffer) = Buffer ko standard byte array mein convert
    //   (kyun? Blob constructor ko Uint8Array chahiye, Node Buffer nahi)
    // { type: mimeType } = Blob ko batana ke ye kis type ki file hai
    const imageBlob = new Blob([new Uint8Array(imageBuffer)], {
      type: mimeType,
    });

    // FORMDATA MEIN FIELDS ADD KARO
    // append(name, value, filename)
    // Teesra argument (filename) zaroori hai files ke liye
    // Isse server ko pata chalta hai ke ye ek FILE hai, text nahi
    formData.append(
      "image", // Field name (API ko yahi chahiye)
      imageBlob, // Actual binary file
      `original.${extension}`, // Filename: "original.png"
    );

    // Text field: user ka prompt (spaces trim karke)
    formData.append("prompt", prompt.trim());

    // MODEL SELECTION
    // FLUX.1 Kontext Pro = Black Forest Labs ka IMAGE EDITING model
    // Ye model original image ko samajh kar usme changes karta hai
    // (text-to-image models naya image banate hain, edit nahi karte)
    formData.append("model", "black-forest-labs/flux.1-kontext-pro");

    // Output image ka size
    formData.append("size", "1024x1024");

    // Response format: "b64_json" = Base64 string JSON mein
    // Alternative: "url" = image ka URL milta
    // Base64 behtar hai kyunke URL expire ho sakta hai
    formData.append("response_format", "b64_json");

    // POLLINATIONS KO REQUEST BHEJO
    const aiResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      cache: "no-store", // Response cache mat karo (har baar fresh result)
    });

    // STEP 8: API ERRORS HANDLE KARO
    // response.ok = status 200-299 ke beech hai?
    if (!aiResponse.ok) {
      // Error details text mein parho (JSON bhi ho sakta hai, isliye .text())
      const details = await aiResponse.text();

      // slice(0, 500) = sirf pehle 500 characters log karo
      // (error response bohat lamba ho sakta hai)
      console.error(
        "Pollinations error:",
        aiResponse.status,
        details.slice(0, 500),
      );

      // SPECIFIC ERROR CODES
      // 402 = Payment Required (credits khatam ya paid model)
      if (aiResponse.status === 402) {
        return NextResponse.json(
          {
            error: "Insufficient Pollen credits or model requires paid credits",
          },
          { status: 402 },
        );
      }

      // 401 = Unauthorized (API key galat hai)
      // 502 = Bad Gateway (upstream service ka issue, humara nahi)
      if (aiResponse.status === 401) {
        return NextResponse.json(
          { error: "Invalid Pollinations API key" },
          { status: 502 },
        );
      }

      // 429 = Too Many Requests (rate limit cross ho gayi)
      if (aiResponse.status === 429) {
        return NextResponse.json(
          { error: "API rate limit reached" },
          { status: 429 },
        );
      }

      // Baqi saare errors (500, 503, etc.)
      return NextResponse.json(
        { error: "Pollinations API request failed" },
        { status: 502 },
      );
    }

    // STEP 9: RESPONSE SE IMAGE NIKALO
    // Pollinations ka response shape:
    // { data: [ { b64_json: "iVBORw0KGgo..." } ] }
    const result = await aiResponse.json();

    // ?. = optional chaining (agar data ya [0] undefined ho to crash na ho)
    const editedBase64: string | undefined = result.data?.[0]?.b64_json;

    // Agar image nahi mili → error throw karo (catch block mein jayega)
    if (!editedBase64) {
      throw new Error("No edited image returned");
    }

    // MAGIC BYTES SE OUTPUT FORMAT DETECT KARO
    // Har image format ke pehle bytes fixed hote hain ("magic numbers"):
    //
    // JPEG → FF D8 FF → Base64 mein "/9j/" se shuru hota hai
    // WebP → "RIFF"   → Base64 mein "UklGR" se shuru hota hai
    // PNG  → 89 50 4E 47 → Base64 mein "iVBOR" se shuru hota hai
    //
    // Kyun zaroori? Model kabhi JPEG deta hai, kabhi PNG
    // Galat MIME type lagane se image display nahi hogi
    const outputMime = editedBase64.startsWith("/9j/")
      ? "image/jpeg"
      : editedBase64.startsWith("UklGR")
        ? "image/webp"
        : "image/png"; // Default: PNG

    // DATA URL BANAO
    // Raw Base64: "iVBORw0..."  → <img src> mein kaam NAHI karta
    // Data URL:   "data:image/png;base64,iVBORw0..."  → kaam karta hai ✅
    // Browser ko MIME type batana zaroori hai
    const editedImage = `data:${outputMime};base64,${editedBase64}`;

    return NextResponse.json({
      success: true,
      editedImage, 
    });
  } catch (error) {
    console.error("Image editing error:", error);

    return NextResponse.json(
      { error: "AI image processing failed" },
      { status: 500 },
    );
  }
}
