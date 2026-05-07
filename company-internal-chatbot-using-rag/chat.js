import dotenv from 'dotenv'
dotenv.config()
import readLine from 'node:readline/promises'
import Groq from 'groq-sdk'
import { GoogleGenAI } from '@google/genai' 
import { Pinecone } from "@pinecone-database/pinecone" 

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const genAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
})
const index = pinecone.index('company-chatbot-index')


export async function chat() {
    const rl = readLine.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    while (true) {
        const question = await rl.question("🧑 User Query: ")

        if (question.toLowerCase() === "exit") {
            break;
        }

        // Query Embedding
        // User ke sawal ko numerical vector mein convert karna taake Pinecone mein search kiya ja sake
        const embeddingResponse = await genAi.models.embedContent({
            model: "gemini-embedding-001",
            contents: {
                role: "user",
                parts: [{ text: question }]
            },
            config: { outputDimensionality: 768 } // Dimension match hona lazmi hai (768)
        })

        const embedding = embeddingResponse.embeddings[0].values

        // Vector Search (Retrieval)
        // Database mein search karna ke is sawal se milte-julte top 3 chunks kaunse hain
        const search = await index.query({
            vector: embedding,
            topK: 3, // Sab se zyada relevant 3 matches uthana
            includeMetadata: true // Text (content) hasil karne ke liye metadata shamil karna
        })

        // Context Preparation 
        // Mile huye chunks ko aik sath jorna taake LLM ko context ke taur par diya ja sake
        const context = search.matches.map((match) => {
            return match.metadata.text;
        }).join("\n\n")

        // Prompt Engineering
        // Question aur Context ko mila kar aik final prompt taiyar karna
        const userQuery = `Question: ${question}
        Relevant Context: ${context}
        Answer: `

        // AI Generation (Augmentation)
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are an assistant for question-answering tasks. Use the following relevant pieces of retrieved context to answer the question. If you don't know the answer, say I don't know."
                },
                {
                    role: "user",
                    content: userQuery
                }
            ]
        })

        console.log("🤖 Assistant: ", completion.choices[0].message.content);
    }

    rl.close()
}

chat()