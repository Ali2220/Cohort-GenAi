import express from 'express'
import cors from "cors"

const app = express()

app.use(express.json())
app.use(cors())

app.get("/chat", (req, res) => {

    // SSE
    // 1. add special header
    // 2. send data in special format
    res.json({})
})

app.listen(3000, () => {
    console.log("Server is running on port 3000");
    
})
