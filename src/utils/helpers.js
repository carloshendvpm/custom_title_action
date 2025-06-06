const fs = require('fs');

function hasLabel(labels, name) {
  return labels.some(label => label.name === name);
}

function loadCustomTemplate(path) {
  if (!path || !fs.existsSync(path)) return null;
  return fs.readFileSync(path, 'utf-8');
}


const titleSysInstruction =`Você é um assistente que gera títulos de Pull Request no estilo Conventional Commits.
        Regras:
        - Gere apenas 1 título.
        - Máximo de 70 caracteres.
        - Não explique nem justifique o título.
        - Não adicione ponto final.
        - Use apenas os tipos: feat, fix, chore, docs, refactor, test.
        - Combine mensagens similares em um só título se necessário.`

const descriptionSysInstruction = `Você é um assistente técnico. Gere uma descrição de Pull Request com base nos arquivos modificados listados abaixo. Use tópicos curtos para descrever o que foi alterado, com foco em clareza e impacto técnico.`

module.exports = { hasLabel, loadCustomTemplate, titleSysInstruction, descriptionSysInstruction };
