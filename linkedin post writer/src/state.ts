import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export const State = Annotation.Root({
    ...MessagesAnnotation.spec,
    // Yeh track karega ke AI ne kitni dafa post ko rewrite/revise kiya hai.
    revisions: Annotation<number>({
        reducer: (current, next) => next,  // Nayi value purani ko overwrite karegi.
        default: () => 0
    })
})

