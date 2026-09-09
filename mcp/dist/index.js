import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
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
// Naya MCP Server instance create kar rahe hain
// name: server ka naam (client ko dikhai dega)
// version: server ka version
const server = new McpServer({ name: "students-server", version: "1.0.0" });
// Ye tool AI ko saare students ki list return karta hai
server.registerTool('get_all_students', {
    description: "return the list of all students",
    inputSchema: z.object({}) // Koi input argument nahi chahiye (khali object)
}, async () => {
    const formatted = students.map(s => `Id: ${s.id}, Name: ${s.name}, Course: ${s.course}`).join('\n');
    // MCP protocol ke mutabiq result return kar rahe hain
    // content array ke andar text type ka message hota hai
    return {
        content: [
            {
                type: "text",
                text: formatted
            }
        ]
    };
});
// Ye prompt template student ID ke hisaab se welcome letter ka prompt generate karta hai
server.registerPrompt("student_welcome_letter", {
    description: "Student ID ke hisab se welcome letter ka prompt banata hai",
    argsSchema: {
        studentId: z.string().describe('The id of a student')
    }
}, async ({ studentId }) => {
    // students array mein se wo student dhoond rahe hain jiska ID match kare
    // Number(studentId) kyunki studentId string mein aata hai, lekin array mein number hai
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
server.registerResource("student_profile", new ResourceTemplate("student://{studentId}/profile", {
    list: async () => {
        return {
            resources: students.map(s => ({
                uri: `student://${s.id}/profile`,
                name: `${s.name} profile`,
                description: `${s.name} (${s.course}) ka profile data`,
                mimeType: 'application/json'
            }))
        };
    }
}), {
    description: "Kisi specific student ka detailed profile",
    mimeType: "application/json"
}, async (uri, params) => {
    const id = Number(params.studentId);
    const student = students.find(s => s.id === id);
    if (!student) {
        return {
            contents: [{
                    uri: uri.href,
                    mimeType: "text/plain",
                    text: `Student with ${id} not found`
                }]
        };
    }
    return {
        contents: [{
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(student, null, 2)
            }]
    };
});
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Ready');
//# sourceMappingURL=index.js.map