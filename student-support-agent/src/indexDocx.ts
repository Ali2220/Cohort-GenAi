import dotenv from 'dotenv'
dotenv.config()
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { GoogleGenAI } from "@google/genai"
import { Pinecone } from '@pinecone-database/pinecone'

async function processAndUpsertPDF() {
    // 1. PDF Load and Read
    const loader = new PDFLoader('./company-docs-formatted.pdf', { splitPages: false })
    const doc = await loader.load()

    // 2. Convert PDF into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 100
    })

    const documents = await textSplitter.splitDocuments(doc)

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY as string,
    })

    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY as string
    })

    const index = pc.index('cohort-customer-support')

    const vectors = []

    // 3. Generate Embeddings & Prepare Vectors
    for (let i = 0; i < documents.length; i++) {
        let chunk = documents[i]?.pageContent

        if (!chunk) continue

        try {
            const response = await ai.models.embedContent({
                model: "gemini-embedding-001",
                contents: {
                    parts: [{ text: chunk }]
                },
                config: {outputDimensionality: 768}
            })

            const embedding = response.embeddings?.[0]?.values

            if (embedding) {
                vectors.push({
                    id: `doc${i}-${Date.now()}`,
                    values: embedding,
                    metadata: {
                        text: chunk
                    }
                })
            }
        } catch (error) {
            console.error(`❌ Embedding API fail ho gayi chunk ${i} par:`, error);
        }
    }

    // 4. Upsert to Pinecone
    if (vectors.length > 0) {
        await index.upsert({
            records: vectors
        })
        console.log("✅ Successfully upserted vectors to Pinecone!");
    } else {
        console.log("⚠️ Upsert skipped: Vectors array khali hai. Pinecone ko empty array nahi bhej sakte.");
    }
}

processAndUpsertPDF();