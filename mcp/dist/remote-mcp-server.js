import express from "express";
import cors from 'cors';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
const students = [
    { id: 101, name: "Ali Khan", course: "Computer Science" },
    { id: 102, name: "Sara Ahmed", course: "Software Engineering" },
    { id: 103, name: "Bilal Hussain", course: "Data Science" },
    { id: 104, name: "Ayesha Malik", course: "Computer Science" },
    { id: 105, name: "Usman Farooq", course: "Cyber Security" },
    { id: 106, name: "Fatima Sheikh", course: "Artificial Intelligence" },
    { id: 107, name: "Hamza Raza", course: "Data Science" },
    { id: 108, name: "Zainab Bukhari", course: "Software Engineering" }
];
const app = express();
app.use(cors());
app.use(express.json());
const server = new McpServer({ name: "remote-mcp-sever", version: "1.0.0" });
server.registerTool("get_all_students", {
    description: "Get all the data of all students",
    inputSchema: z.object({})
}, async () => {
    const formatedStudents = students.map(s => `Id: ${s.id}, Name: ${s.name}, Course: ${s.course}`).join('\n');
    return {
        content: [{
                type: "text",
                text: formatedStudents
            }]
    };
});
app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
//# sourceMappingURL=remote-mcp-server.js.map