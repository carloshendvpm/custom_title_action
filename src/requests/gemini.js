const axios = require('axios');

async function callGemini(prompt, geminiKey) {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    { contents: [{ parts: [{ text: prompt }] }] },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

module.exports = { callGemini };
