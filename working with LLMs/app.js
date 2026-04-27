import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function main() {
  const completion = await groq.chat.completions.create({
    // LLM settings
    temperature: 0.3,
    // stop: "tr",   // Neutral
    // max_completion_tokens: 1000,
    // frequency_penalty:
    model: "llama-3.3-70b-versatile",
    messages: [
      // system prompt or system instructions
      {
        role: "system",
        content:
          "You are Jarvis, a smart review grader. Your task is to analyze given review and return the sentiment only. Output must be single word",
      },
      {
        role: "user",
        content: `These headphone arrived quickly and look great, but the left earcup stopped working after a week
        Sentiment: 
        `,
      },
    ],
    
  });

  console.log(completion.choices[0].message.content);
}
main();
