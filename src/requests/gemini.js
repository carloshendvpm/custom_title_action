const { GoogleGenAI } = require('@google/genai');
const core = require('@actions/core');
const { GEMINI_CONFIG } = require('../config/constants');

async function callGemini(prompt, geminiKey, systemInstruction, maxOutputTokens = GEMINI_CONFIG.MAX_OUTPUT_TOKENS.TITLE) {
  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const contents = [];

    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const response = await ai.models.generateContent({
      model: GEMINI_CONFIG.MODEL,
      contents: contents,
      config: {
        maxOutputTokens: maxOutputTokens,
        systemInstruction: systemInstruction,
        temperature: GEMINI_CONFIG.TEMPERATURE,
      },
    });

    const result = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!result) {
      throw new Error('Resposta vazia do Gemini');
    }

    return result;
  } catch(error) {
    core.error(`Erro ao chamar Gemini: ${error.message}`);
    throw error; 
  }
}

module.exports = { callGemini };