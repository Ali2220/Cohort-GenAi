import { Annotation, MessagesAnnotation } from "@langchain/langgraph"
import z from "zod"

export const graphState = Annotation.Root({
    ...MessagesAnnotation.spec
})

export const reflectionSchema = z.object({
    missing: z.string().describe("Critique of what is missing."),
    superfluous: z.string().describe("Critique of what is superfluous")
})

export const questionAnswerSchema = z.object({
    answer: z.string().describe('~250 word detailed answer to the question.'),
    reflection: reflectionSchema,
    searchQueries: z.array(z.string().describe("1-3 search queries for researching improvements to address the critique of your current answer."))
})