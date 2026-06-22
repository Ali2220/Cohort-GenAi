import { Annotation, MessagesAnnotation } from "@langchain/langgraph"

export const graphState = Annotation.Root({
    ...MessagesAnnotation.spec
})