import express from "express";
const app = express()
// import { generate } from './chatbot.js'
import cors from 'cors'
import {generate} from './graph.js'

app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
    res.send("Hello World")
})

app.post('/chat', async (req, res) => {
    const { message} = req.body

    if (!message) {
        return res.status(400).json({
            message: "All fields are required"
        })
    }

    const result = await generate(message)

    res.json({ message: result })
})

app.listen(3000, () => {
    console.log('Server is running on port 3000');

})