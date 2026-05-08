import Groq from "groq-sdk";
import readLine from 'node:readline/promises'

// Groq client initialize karo (API key environment variable se)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Temporary databases (memory mein store hoga, server restart par reset)
let expenseDB = []
let incomeDB = []

// Main function jo user se baat karega aur LLM ko call karega
async function callAgent() {

    // Readline interface banayein terminal se input lene ke liye
    const rl = readLine.createInterface({ input: process.stdin, output: process.stdout })

    // Messages array jo poori conversation store karega (system prompt + user + assistant + tool results)
    const messages = [
        {
            role: "system",
            content: `You are Maya, a personal finance assistant. Your task is to assist user with their expenses, balances and financial planning.
            You have access to following tools:
            1. getTotalExpense({from, to}): string // Get total expense for a time period.
            2. addExpense({name, amount}): string // Add new expense to the expense database.
            3. addIncome({name, amount}): string // Add new income to income database.
            3. getMoneyBalance(): string // Get remaining money balance from database.

            current datetime: ${new Date().toUTCString()}`
        },
    ]


    // Infinite loop - jab tak user "exit" na type kare, tab tak chalta rahega
    while (true) {
        // User se input lo
        const question = await rl.question("User Question: ")

        // Agar user exit likhe to loop tod do
        if (question.toLowerCase() === "exit") {
            break
        }

        // User ka message messages array mein add karo
        messages.push({
            role: "user",
            content: question
        })

        // Inner loop - ye LLM ke tool calls ko handle karega
        while (true) {
            // Groq API call karo with messages and tools definitions
            const response = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "getTotalExpense",
                            description: "get total expense from date to date",
                            parameters: {
                                type: "object",
                                properties: {
                                    from: { type: "string", description: "from date to get the expense" },
                                    to: { type: "string", description: "to date to get the expense" }
                                }
                            }
                        }
                    },
                    {
                        type: "function",
                        function: {
                            name: "addExpense",
                            description: "add new expense entry in expense db",
                            parameters: {
                                type: "object",
                                properties: {
                                    name: { type: "string", description: "Name of the expense. example: Buy a laptop" },
                                    amount: { type: "string", description: "amount of the expense" }
                                }
                            }
                        }
                    },
                    {
                        type: "function",
                        function: {
                            name: "addIncome",
                            description: "add new income entry in income db",
                            parameters: {
                                type: "object",
                                properties: {
                                    name: { type: "string", description: "Name of the income." },
                                    amount: { type: "string", description: "amount of the income" }
                                }
                            }
                        }
                    },
                    {
                        type: "function",
                        function: {
                            name: "getBalance",
                            description: "get balance of a user",
                        }
                    }
                ],
                messages: messages
            })

            // Assistant ka response messages array mein push karo
            messages.push(response.choices[0].message)

            // Check karo ki assistant ne koi tool call kiya hai ya nahi
            const toolCalls = response.choices[0].message.tool_calls

            // Agar koi tool call nahi hai, to simple text reply hai - print karo aur inner loop break karo
            if (!toolCalls) {
                console.log("Assistant: ", response.choices[0].message.content);
                break
            }

            // Agar tool calls hain, to har ek tool ke liye relevant JS function call karo
            for (const tool of toolCalls) {
                const functionName = tool.function.name
                const functionArgs = tool.function.arguments   // JSON string mein aata hai

                let result = ""
                if (functionName === "getTotalExpense") {
                    result = getTotalExpense(JSON.parse(functionArgs))
                } else if (functionName === "addExpense") {
                    result = addExpense(JSON.parse(functionArgs))
                } else if (functionName === "addIncome") {
                    result = addIncome(JSON.parse(functionArgs))
                } else if (functionName === "getBalance") {
                    result = getBalance()
                }

                // Tool ka result "tool" role ke saath messages mein add karo (taaki LLM use dekh sake)
                messages.push({
                    role: "tool",
                    content: result,
                    tool_call_id: tool.id
                })
            }
            // Loop dobara chalege, taaki LLM tool result ke basis par next action le
        }
    }

    rl.close()
}

callAgent()

// TOOL IMPLEMENTATIONS

// Total expense calculate karta hai (from, to abhi ignore ho rahe hain - sab expense ka total)
function getTotalExpense({ from, to }) {
    // Sab expenses ka sum nikal lo reduce se
    const expense = expenseDB.reduce((acc, item) => {
        return acc + item.amount  
    }, 0)

    return `Total Expense ${expense}`
}

// Naya expense database mein add karta hai
function addExpense({ name, amount }) {
    expenseDB.push({
        name,
        amount
    })
    return `Expense Added to the Database`
}

// Naya income database mein add karta hai
function addIncome({ name, amount }) {
    incomeDB.push({ name, amount })
    return `Income Added to the Database`
}

// Net balance calculate karta hai (total income - total expense)
function getBalance() {
    // Total income nikal lo
    const income = incomeDB.reduce((acc, item) => {
        return acc + item.amount
    }, 0)

    // Total expense nikal lo
    const expense = expenseDB.reduce((acc, item) => {
        return acc + item.amount
    }, 0)

    return `Your Balance is ${income - expense}`
}