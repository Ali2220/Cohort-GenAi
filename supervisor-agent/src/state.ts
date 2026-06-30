import {Annotation, MessagesAnnotation} from "@langchain/langgraph"

export const State = Annotation.Root({
    ...MessagesAnnotation.spec,
    // Supervisor batayega ke agla kon chalega
    nextAgent: Annotation<string>,
    // Agar dono agents chalne hain toh final report yahan save hogi
    finalResponse: Annotation<string>
})