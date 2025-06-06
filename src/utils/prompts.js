function buildTitlePrompt(commitMessages) {
  return `Mensagens de commit:
  ${commitMessages}
  `.trim();
}

function buildDescriptionPrompt(modifiedFiles) {
  return`
  Arquivos modificados:
  ${modifiedFiles}

  Inclua contexto, funcionalidades impactadas e possíveis efeitos colaterais.
  Mantenha o padrão:
  ### Descrição

  Por favor, inclua uma descrição clara e concisa do que esta Pull Request visa alcançar. Explique a motivação por trás das alterações e como elas contribuem para o projeto.

  ### O que foi feito?

  - Feature A;
  - Feature B;
  - Refactor C.

  ### Screenshots (se aplicável)

  Adicione capturas de tela que ajudem a ilustrar as alterações, se aplicável.

  ---

  ### Checklist

  - [ ] Minhas alterações passaram nos testes locais;
  - [ ] Eu atualizei a documentação (_se necessário_);
  - [ ] Meus commits, branch e esse PR segue as diretrizes [recomendadas](https://app.clickup.com/3107481/v/dc/2yumt-2783/2yumt-99853) de estilo do projeto;
  - [ ] Eu verifiquei a existência de conflitos com o branch principal;
  - [ ] Eu solicitei revisão(s) para esta PR de ao menos um outro colaborador;
  - [ ] Eu revisei meu próprio código antes de enviar.
  `.trim();
}

module.exports = { buildTitlePrompt, buildDescriptionPrompt };
