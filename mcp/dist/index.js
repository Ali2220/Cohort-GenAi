import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from 'zod';
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
const server = new McpServer({ name: "students-server", version: "1.0.0" });
server.registerTool('get_all_students', {
    description: "return the list of all students",
    inputSchema: z.object({})
}, async () => {
    const formatted = students.map(s => `Id: ${s.id}, Name: ${s.name}, Course: ${s.course}`).join('\n');
    return {
        content: [
            {
                type: "text",
                text: formatted
            }
        ]
    };
});
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Ready');
//# sourceMappingURL=index.js.map