const MESSAGES = {
  pt: {
    milestoneMissing: '❌ Milestone não definida',
    assigneesMissing: '❌ Assignees não definidos',
    labelsMissing: '❌ Labels não definidas',
  },
  en: {
    milestoneMissing: '❌ Milestone not defined',
    assigneesMissing: '❌ Assignees not defined',
    labelsMissing: '❌ Labels not defined',
  }
};

const LABELS = {
  GENERATE_TITLE: 'generate-title',
  GENERATE_DESCRIPTION: 'generate-description',
  GENERATE_FULL_PR: 'generate-full-pr'
};

const GEMINI_CONFIG = {
  MODEL: 'gemini-2.0-flash',
  TEMPERATURE: 0.1,
  MAX_OUTPUT_TOKENS: {
    TITLE: 80,
    DESCRIPTION: 500
  }
};

const SYSTEM_INSTRUCTIONS = {
  TITLE: `Você é um assistente que gera títulos de Pull Request no estilo Conventional Commits.
  Regras:
  - Gere apenas 1 título.
  - Máximo de 70 caracteres.
  - Não explique nem justifique o título.
  - Não adicione ponto final.
  - Use apenas os tipos: feat, fix, chore, docs, refactor, test.
  - Combine mensagens similares em um só título se necessário.`,

  DESCRIPTION: `Você é um assistente técnico. Gere uma descrição de Pull Request com base nos arquivos modificados listados abaixo. 
  Use tópicos curtos para descrever o que foi alterado, com foco em clareza e impacto técnico.`
};

module.exports = {
  MESSAGES,
  LABELS,
  GEMINI_CONFIG,
  SYSTEM_INSTRUCTIONS
}; 