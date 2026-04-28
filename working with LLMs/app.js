import dotenv from 'dotenv'
dotenv.config()
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
    // frequency_penalty:,

    model: "llama-3.3-70b-versatile",
    messages: [
      // system prompt or system instructions
      {
        role: "system",
        content: `You are Jarvis, a smart review grader. 
                  Analyze the review and return the output in JSON format only. Dont write any thing else outside the {}
                  The JSON should have these keys:
                  1. "sentiment": (Positive, Negative, or Neutral)
                  2. "score": (A confidence score between 0 and 1)
                  3. "issue_detected": (Boolean - true if there's a problem mentioned)
        `,
      },
      {
        role: "user",
        content: `These headphone arrived quickly and look great, but the left earcup stopped working after a week
        Sentiment: 
        `,
      },
    ],

    // structured Output
    response_format: {
      type: "json_object",
    }
  });

  console.log(JSON.parse(completion.choices[0].message.content));
}
main();
