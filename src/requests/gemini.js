const { GoogleGenAI } = require('@google/genai');
const core = require('@actions/core');




async function callGemini(prompt, geminiKey, systemInstruction) {
  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const contents = [];

    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
      config: {
        maxOutputTokens: 80,
        systemInstruction: systemInstruction || "Você é um assistente de IA especializado em ajudar desenvolvedores a criar títulos e descrições de PRs no GitHub.",
        temperature: 0.1,
      },
    });
    return response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  } catch(error) {
    core.setFailed(`Erro ao chamar Gemini: ${error.message}`);
    throw error; 
  }
}

module.exports = { callGemini };