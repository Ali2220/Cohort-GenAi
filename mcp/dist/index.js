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
server.registerPrompt("student_welcome_letter", {
    description: "Student ID ke hisab se welcome letter ka prompt banata hai",
    argsSchema: {
        studentId: z.string().describe('The id of a student')
    }
}, async ({ studentId }) => {
    const student = students.find(s => s.id === Number(studentId));
    if (!student) {
        return {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `${studentId} wala user nhi mila. Please sahi studentId dalo.`
                    }
                }
            ]
        };
    }
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Aap ek university counselor hain. Student "${student.name}" (ID: ${student.id}) ne "${student.course}" course join kiya hai. Unke liye ek formal welcome letter likhein aur is course mein kamyabi ke 3 tips shamil karein.`
                }
            }
        ]
    };
});
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Ready');
//# sourceMappingURL=index.js.map