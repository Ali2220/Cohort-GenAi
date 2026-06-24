import { Annotation, MessagesAnnotation } from "@langchain/langgraph"
import z from "zod"

// ==========================================
// 🧠 GRAPH STATE
// ==========================================
export const graphState = Annotation.Root({
    // MessagesAnnotation.spec hamari chat history ko array mein store karta hai.
    // Isme HumanMessage aur AIMessage save hote hain.
    // Dikhta kaisa hai: 
    // messages: [ 
    //   HumanMessage(content: "What is quantum computing?"), 
    //   AIMessage(content: '{"answer": "...", "reflection": {...}}') 
    // ]
    ...MessagesAnnotation.spec,
    iterations: Annotation<number>({
        reducer: (cur, next) => next,
        default: () => 0
    })
})

// ==========================================
// 📐 ZOD SCHEMAS (LLM Output Formatting)
// ==========================================

// Reflection ka schema: LLM apni hi generated report ki galtiyan nikal kar yahan dega.
export const reflectionSchema = z.object({
    missing: z.string().describe("Critique of what is missing."),
    superfluous: z.string().describe("Critique of what is superfluous")
})
// Data dikhta kaisa hai:
// {
//   "missing": "The answer lacks specific examples of quantum algorithms like Shor's.",
//   "superfluous": "The detailed history of classical computers in the first paragraph is unnecessary."
// }

// Main Answer Schema: Yeh LLM ka final structured response hoga jismein answer, 
export const questionAnswerSchema = z.object({
    answer: z.string().describe('~250 word detailed answer to the question.'),
    reflection: reflectionSchema,
    searchQueries: z.array(z.string().describe("1-3 search queries for researching improvements to address the critique of your current answer."))
})
// Data dikhta kaisa hai:
// {
//   "answer": "Quantum computing is an area of study...",
//   "reflection": { "missing": "...", "superfluous": "..." },
//   "searchQueries": ["Shor's algorithm examples", "quantum vs classical processing speed"]
// }

// Typescript type taake aage code mein type-safety mil sake.
export type QuestionAnswer = z.infer<typeof questionAnswerSchema>