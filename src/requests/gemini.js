import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: geminiKey });

async function callGemini(prompt) {
  const contents = [];

  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: contents,
    config: {
      maxOutputTokens: 80,
      temperature: 0.3,
    },
  });
  return response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

module.exports = { callGemini };