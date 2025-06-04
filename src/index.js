const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');

async function run(){
  try {
    const githubToken = core.getInput('github-token', { required: true });
    const geminiKey = core.getInput('gemini-token', { required: true });

    if (!githubToken || !geminiKey) {
      core.setFailed('Os tokens do GitHub e Gemini são obrigatórios.');
      return;
    }

    const octokit = github.getOctokit(githubToken);
    const context = github.context;
    const pr = context.payload.pull_request;
    if (!pr) {
      core.setFailed('This action can only be run on pull requests.');
      return;
    }
    const label = context.payload.label?.name;

    if (label !== 'generate-title') {
      core.info(`🏷️ Label recebida: "${label}". Ignorando PR sem a label "generate-title".`);
      return;
    }

    const { owner, repo } = context.repo;
    const prNumber = pr.number;

    const { data: commits } = await octokit.rest.pulls.listCommits({
      owner,
      repo,
      pull_number: prNumber
    });
    const commitMessages = commits.map(commit => commit.commit.message).join('\n');

    const { data: files } = await octokit.rest.pulls.listFiles({ 
      owner, 
      repo, 
      pull_number: prNumber 
    });
    const modifiedFiles = files.map(file => file.filename).join('\n');

    const titlePrompt = `
    Você é um assistente que gera títulos curtos de Pull Requests seguindo o padrão de Conventional Commits.

    Com base nas mensagens de commit abaixo, gere um título de PR sucinto (máximo 70 caracteres), começando com um prefixo apropriado como \`feat:\`, \`fix:\`, \`refactor:\`, \`chore:\`, etc. Use linguagem clara, objetiva e sem emojis.

    Mensagens de commit:
    ${commitMessages}
    `.trim();

    const descriptionPrompt = `
    Você é um assistente técnico. Gere uma descrição de Pull Request com base nos arquivos modificados listados abaixo. Use tópicos curtos para descrever o que foi alterado, com foco em clareza e impacto técnico.

    Arquivos modificados:
    ${modifiedFiles}

    Inclua contexto, funcionalidades impactadas e possíveis efeitos colaterais.
    Mantenha a descrição abaixo de 300 palavras.
    `;

    async function callGemini(prompt) {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    }

    const newTitle = await callGemini(titlePrompt);
    const newDescription = await callGemini(descriptionPrompt);
    if (!newTitle || !newDescription) {
      core.setFailed('Não foi possível gerar o título ou a descrição do PR.');
      return;
    }
    await octokit.rest.pulls.update({
      owner,
      repo,
      pull_number: prNumber,
      title: newTitle,
      body: finalBody,
    });
    core.info(`✅ Título do PR atualizado para: "${newTitle}"`);
    core.info(`📝 Descrição do PR atualizada: "${newDescription}"`);

  } catch (error) {
    core.setFailed(`❌ Erro ao atualizar o título do PR: ${error.message}`);
  } finally {
    core.info('Ação concluída.');
  }
}

run();
