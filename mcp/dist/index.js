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
// Resource register kar rahe hain jo specific student ka profile return karegi
server.registerResource("student_profile", // 1. Resource ka internal naam (unique identifier)
// 2. ResourceTemplate: Dynamic URI banane ke liye
new ResourceTemplate("student://{studentId}/profile", {
    // LIST CALLBACK: Ye function jab call hoga to saare available resources ki list return karega
    // Ye zaroori hai taake Claude Desktop UI mein resources dikh saken
    list: async () => {
        return {
            // Har student ke liye ek resource object bana rahe hain
            resources: students.map(s => ({
                uri: `student://${s.id}/profile`, // Har student ka unique URI
                name: `${s.name} profile`, // UI mein dikhne wala naam
                description: `${s.name} (${s.course}) ka profile data`, // Description jo AI ko batayegi ke ye resource kya hai
                mimeType: 'application/json' // Data format (JSON)
            }))
        };
    }
}), 
// 3. Resource metadata (configuration)
{
    description: "Kisi specific student ka detailed profile", // AI ko batata hai ke ye resource kya karta hai
    mimeType: "application/json" // Data ka format (JSON structured data)
}, 
// 4. Handler function: Ye tab chalega jab AI kisi specific resource ko read karega
async (uri, params) => {
    // params.studentId se dynamic ID extract kar rahe hain (URI se nikla hua value)
    const id = Number(params.studentId); // String ko number mein convert karna
    // Students array mein se wo specific student dhoond rahe hain
    const student = students.find(s => s.id === id);
    // Agar student nahi milta (invalid ID)
    if (!student) {
        // Error message return karna
        return {
            contents: [{
                    uri: uri.href, // Jo URI call hui thi
                    mimeType: "text/plain", // Simple text format
                    text: `Student with ${id} not found` // Error message
                }]
        };
    }
    // Agar student mil jaye to uska data JSON format mein return karna
    return {
        contents: [{
                uri: uri.href, // Jo URI call hui thi
                mimeType: "application/json", // JSON format specify karna
                text: JSON.stringify(student, null, 2) // Student object ko formatted JSON string mein convert karna
                // null, 2 ka matlab: pretty print karo (2 spaces indentation ke sath)
            }]
    };
});
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Ready');
//# sourceMappingURL=index.js.map