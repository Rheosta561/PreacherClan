import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateVikingChallenge(exercises = []) {

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


  const prompt = `
You are a Viking Skald writing warrior-style fitness challenges.

Create a Viking themed challenge using ONLY these exercises:
${JSON.stringify(exercises, null, 2)}

if no exercises create a workout challenge achievable 

Return JSON ONLY in this exact format:

{
  "title": "string",
  "description": "string",
  "rules": ["string","string","string"]
}

Rules:
- Title must sound Viking/Norse themed
- Description must be motivating, intense, warrior-like
- Rules must be SHORT and actionable
- Use the exercises provided in the rules
- No emojis
- No markdown
- Do NOT add extra text
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();


  return JSON.parse(text);
}
