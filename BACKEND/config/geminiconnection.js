import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const ai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function callGemini(prompt) {
  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);

    return result.response.text().trim();
  } catch (err) {
    console.error("Gemini API error:", err);
    return null;
  }
}
