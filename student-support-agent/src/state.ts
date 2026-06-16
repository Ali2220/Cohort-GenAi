import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export const StateAnnotation = Annotation.Root({
    
    // MessagesAnnotation mai messages ka array hota hai, jo puri chat-history hoti hai.
    ...MessagesAnnotation.spec,
    
    // custom state
    nextRepresentative: Annotation<string>,
    summary: Annotation<string>
});