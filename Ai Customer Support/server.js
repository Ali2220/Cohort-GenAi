import { agent } from './agent.js'
import express from 'express'
const app = express()


app.use(express.json())

app.post('/chat', async (req, res) => {
    try {

        const { query, userId } = req.body

        const result = await agent.invoke(
            {
                messages: [
                    {
                        role: "system",
                        content: `Identity: You are the official support bot for "Hala Madrid" clothing brand.

                        Instructions:
                        1. Inventory: User jab bhi kisi product ka pooche ya stock ka sawal kare, 'checkInventory' tool use karein.
                        - Agar user specific item nahi batata (e.g., "kya kya hai?"), to tool mein item="all" pass karein.
                        2. Orders: Order track karne ke liye 'track_order' tool use karein.
                        3. Boundary: Sirf inventory aur orders se mutaliq jawab dein. Baaki sawalon par politely mana kar dein.

                        Tone: Enthusiastic (like a Real Madrid fan!), polite, and professional. 
                        Language: Roman Urdu/English.`
                    },
                    {
                        role: "human",
                        content: query
                    }
                ]
            },
            {
                configurable: { thread_id: userId }
            }
        )

        const response = result.messages[result.messages.length - 1].content;
        res.status(200).json({
            message: response
        })
    } catch (err) {
        res.status(500).json({
            error: err.message
        })
    }
})

app.listen(3000, () => {
    console.log('Server is running on port 3000');

})