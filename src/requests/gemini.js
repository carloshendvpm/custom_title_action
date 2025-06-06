const { GoogleGenAI } = require('@google/genai');
const core = require('@actions/core');




async function callGemini(prompt, geminiKey) {
  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const contents = [];

    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
      config: {
        maxOutputTokens: 80,
        systemInstruction: `Você é um assistente que gera títulos de Pull Request no estilo Conventional Commits.
        Regras:
        - Gere apenas 1 título.
        - Máximo de 70 caracteres.
        - Não explique nem justifique o título.
        - Não adicione ponto final.
        - Use apenas os tipos: feat, fix, chore, docs, refactor, test.
        - Combine mensagens similares em um só título se necessário.`,
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