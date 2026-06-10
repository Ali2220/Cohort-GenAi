import { tool } from "@langchain/core/tools";
import { Pinecone } from '@pinecone-database/pinecone'
import { GoogleGenAI } from '@google/genai'
import z from "zod";

const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!
})

const index = pc.index('cohort-customer-support')

export const getOffers = tool(
    () => {
        return JSON.stringify([
            {
                code: 'LAUNCH',
                discount_percent: 30
            },
            {
                code: 'FIRST_20',
                discount_percent: 30
            }
        ])
    },
    {
        name: 'getOffers',
        description: 'Call this tool to get the available discounts and offers',
    }
)

export const retrieve_data = tool(
    async ({ queryText }: { queryText: string }) => {
        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY!
        })

        const embeddingResponse = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: {
                parts: [{ text: queryText }]
            },
            config: { outputDimensionality: 768 }
        })

        const embedding = embeddingResponse?.embeddings?.[0]?.values

        let query = await index.query({
            vector: embedding!,
            topK: 3,
            includeMetadata: true
        })

        const toolResponse = query.matches.map((match) => {
            return match.metadata?.text
        })

        return toolResponse.length > 0 ? toolResponse.join('\n\n') : 'No relevant matching data found in the knowledge base.'

    },
    {
        name: 'retrieve_data',
        description: 'Call this tool to retrieve relevant course details, language, syllabus, and educational data from the vector database.',
        schema: z.object({
            queryText: z.string().describe("The specific search query or keywords to look up in the vector database based on user's question.")
        })
    }
)

