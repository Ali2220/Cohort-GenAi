import express from "express";
const app = express()
import { generate } from './chatbot.js'

app.use(express.json())

app.get('/', (req, res) => {
    res.send("Hello World")
})

app.post('/chat', async (req, res) => {
    const { message } = req.body

    const result = await generate(message)

    res.json({ message: result })
})

app.listen(3000, () => {
    console.log('Server is running on port 3000');

})