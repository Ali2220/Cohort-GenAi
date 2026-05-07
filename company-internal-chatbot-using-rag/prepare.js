import dotenv from 'dotenv'
dotenv.config()
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenAI } from '@google/genai'
import { Pinecone } from "@pinecone-database/pinecone"

export async function indexTheDocument(filePath) {
    try {
        // STEP 1: PDF Loading (via LangChain) ---
        // { splitPages: false } ka matlab hai ke puri PDF ko aik sath read karna hai
        const loader = new PDFLoader(filePath, { splitPages: false });
        const doc = await loader.load();

        // STEP 2: Text Splitting (via LangChain) ---
        // ChunkSize 500 characters rakhi hai aur overlap 100 characters taake context barkarar rahe
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 100
        });

        // splitDocuments() method document ko chote chote tukron (chunks) mein tod deta hai
        const documents = await textSplitter.splitDocuments(doc);
        console.log(`Total chunks created: ${documents.length}`);

        // --- STEP 3: Clients Initialization (Native SDKs) ---
        // Google GenAI client initialize ho raha hai
        const genAi = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        })

        // Pinecone client initialize ho raha hai
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        })

        // Wo specific index select kar rahe hain jahan vectors save karne hain
        const index = pinecone.index('company-chatbot-index')

        const vectors = []

        // STEP 4: Embedding Generation (Native Google API) ---
        // Har chunk ke upar loop chalaya ja raha hai
        for (let i = 0; i < documents.length; i++) {
            let chunk = documents[i].pageContent

            // Native Google SDK ke zariye embedding generate ho rahi hai
            const embeddingResponse = await genAi.models.embedContent({
                model: "gemini-embedding-001", // Embedding model name
                contents: {
                    role: "user",
                    parts: [{ text: chunk }]
                },
                config: { outputDimensionality: 768 } // Gemini-001 ke liye 768 dimensions
            })

            // Response se numerical vector (values) nikalna
            const embedding = embeddingResponse.embeddings[0].values

            // Pinecone format ke mutabiq object taiyar karna
            vectors.push({
                id: `doc${i}-${Date.now()}`, // Har chunk ke liye unique ID
                values: embedding, // Numerical vector
                metadata: {
                    text: chunk  // Original text save karna taake search result mein dikhaya ja sake
                }
            })
        }

        // STEP 5: Vector Upload (Native Pinecone API) ---
        // Saare vectors ko aik sath Pinecone database mein upload (upsert) karna
        console.log("🚀 Uploading to Pinecone...");
        await index.upsert(vectors)
        console.log("Successfully Indexed!");

    } catch (error) {
        // Kisi bhi kism ke error ko pakadne aur console mein dikhane ke liye
        console.error("Error Detail:");
        console.error(error.message || error);
    }
}