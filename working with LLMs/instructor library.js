// instructor library AI ke "Raw Text" aur aap ke "Code" ke darmiyan aik bridge hai jo Zod (JavaScript/TypeScript mein) ka istemal kar ke data ko validate karta hai.

// Instructor-library se teen main kaam hote hain:
// 1. Schema Enforcement: Aap batate hain ke mujhe exact ye keys aur ye data types (String, Number, Boolean) chahiye.

// 2. Auto-Retries: Agar AI ghalti se ghalat JSON bhej de, to Instructor khud hi usay batata hai ke "Bhai tum ne ghalti ki hai, isay theek karo" aur dobara koshish karta hai.

// 3. Type Safety: Aap ko JSON.parse() karne ki zaroorat nahi parti, aap ko direct aik valid object milta hai.

import dotenv from 'dotenv'
dotenv.config()
import Instructor from '@instructor-ai/instructor'
import Groq from 'groq-sdk'
import { z } from 'zod'

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

// 1. Instructor ko initialize krein
const instr = Instructor({
    client: client,
    mode: "TOOLS"
})

// 2. Apne data ka "Dancha" (Schema) banayein
const sentimentSchema = z.object({
    sentiment: z.enum(['Positive', 'Negative', 'Neutral']),
    score: z.number().min(0).max(1),
    reason: z.string().describe('Aik line mai wajah btao    ')
})

async function main() {
    // 3. AI ko call karein (Directly validated object milega)
    const result = await instr.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{
            role: "user",
            content: "The service was slow but food was great."
        }],
        response_model: { schema: sentimentSchema, name: "Sentiment" },
        max_retries: 3 // Agar AI ghalat format de, to 3 baar khud koshish karo
    })

    console.log(result.sentiment);
    console.log(result.score);
    console.log(result.reason);

}

main()