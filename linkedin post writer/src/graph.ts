import { START, StateGraph } from "@langchain/langgraph"
import { State } from "./state.js"

async function generator(state: typeof State.State) {
    return state
}

async function reflector(state: typeof State.State){
    return state
}


function isReflectorNext(state: typeof State.State){
    // condition logic
    return ''
}

const graph = new StateGraph(State)
.addNode("generator", generator)
.addNode("reflector", reflector)
// edges
.addEdge(START, 'generator')
.addConditionalEdges('generator', isReflectorNext, {})
.addEdge("reflector", "generator")
