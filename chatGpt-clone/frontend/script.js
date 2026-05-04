const input = document.getElementById("input")
const chatContainer = document.querySelector("#chat-container")
const askBtn = document.querySelector("#ask")

const threadId = Date.now().toString(36) + Math.random().toString(36).substring(2, 8)


input.addEventListener("keyup", handleEnter)
askBtn.addEventListener('click', handleAsk)

const loading = document.createElement("div")
loading.className = 'my-6 animate-pulse'
loading.textContent = 'Searching the Web...'

async function generate(text) {
    // 1. append message to Ui
    // 2. send message to Ai
    // 3. Append ai-response to Ui
    const msg = document.createElement('div')
    msg.className = `my-6 bg-neutral-800 p-3 rounded-xl ml-auto max-w-fit`
    msg.textContent = text
    chatContainer.appendChild(msg)
    input.value = ''

    chatContainer.appendChild(loading)

    // Call Server
    const assistantMessage = await callServer(text)
    const assistantMsgElem = document.createElement('div')
    assistantMsgElem.className = `my-6 bg-neutral-700 p-3 rounded-xl mr-auto max-w-[80%] text-white shadow-sm`
    assistantMsgElem.textContent = assistantMessage
    loading.remove()
    chatContainer.appendChild(assistantMsgElem)
}

async function callServer(inputText) {
    // Backend API ko message bhejna
    const response = await fetch('http://localhost:3000/chat', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ threadId: threadId, message: inputText })  // Backend 'message' key expect kar raha hai
    })

    if (!response.ok) {
        throw new Error("Error generating the response")
    }

    const result = await response.json()
    return result.message
}

async function handleEnter(e) {
    if (e.key === "Enter") {
        const text = input.value.trim()

        if (!text) {
            return
        }

        await generate(text)
    }
}

async function handleAsk(e) {
    const text = input.value.trim()
    if (!text) {
        return
    }

    await generate(text)

}