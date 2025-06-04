module.exports = {
  REQUIRED_LABEL: 'generate-title',
  MAX_TITLE_LENGTH: 70,
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  
  
  MESSAGES: {
    TOKENS_REQUIRED: 'Os tokens do GitHub e Gemini são obrigatórios.',
    PR_ONLY: 'This action can only be run on pull requests.',
    ACTION_COMPLETED: 'Ação concluída.',
    GEMINI_SUCCESS: 'Resposta da API Gemini recebida com sucesso.',
    INVALID_GEMINI_RESPONSE: 'Resposta inválida da API Gemini.'
  }
};