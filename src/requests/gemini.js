const { GoogleGenAI } = require('@google/genai');
const core = require('@actions/core');

async function callGemini(prompt, geminiKey) {
  const ai = new GoogleGenAI({ apiKey: geminiKey });
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
  return core.log(response)
}

module.exports = { callGemini };