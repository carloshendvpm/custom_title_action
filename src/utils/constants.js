const MESSAGES = {
  pt: {
    milestoneMissing: "O campo 'Milestone' está faltando.",
    assigneesMissing: "O campo 'Assignees' está faltando.",
    labelsMissing: "O campo 'Labels' está faltando."
  },
  en: {
    milestoneMissing: "The 'Milestone' field is missing.",
    assigneesMissing: "The 'Assignees' field is missing.",
    labelsMissing: "The 'Labels' field is missing."
  }
};

function generatePRCommentMessage(msgTexts, missingFields) {
  return `⚠️ Atenção!\n\n${missingFields.join('\n')}\n\nPor favor, preencha os campos obrigatórios.`;
}

module.exports = { MESSAGES, generatePRCommentMessage }; 