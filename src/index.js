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

    const prompt = `
    Você é um assistente que gera títulos curtos de Pull Requests seguindo o padrão de Conventional Commits.

    Com base nas mensagens de commit abaixo, gere um título de PR sucinto (máximo 70 caracteres), começando com um prefixo apropriado como \`feat:\`, \`fix:\`, \`refactor:\`, \`chore:\`, etc. Use linguagem clara, objetiva e sem emojis.

    Mensagens de commit:
    ${commitMessages}
    `.trim();

    let geminiResponse;
    try {
      geminiResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      core.info('Resposta da API Gemini recebida com sucesso.');
    } catch (geminiApiError) {
      if (geminiApiError.response) {
        core.setFailed(`❌ Erro da API Gemini: Status ${geminiApiError.response.status} - ${JSON.stringify(geminiApiError.response.data)}`);
      } else if (geminiApiError.request) {
        core.setFailed(`❌ Erro de rede ao chamar a API Gemini: ${geminiApiError.message}`);
      } else {
        core.setFailed(`❌ Erro desconhecido na API Gemini: ${geminiApiError.message}`);
      }
      return;
    }

    const newTitle = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!newTitle) {
      throw new Error('Resposta inválida da API Gemini.');
    }

    await octokit.rest.pulls.update({
      owner,
      repo,
      pull_number: prNumber,
      title: newTitle,
    });

    core.info(`✅ Título atualizado: ${newTitle}`);
  } catch (error) {
    core.setFailed(`❌ Erro ao atualizar o título do PR: ${error.message}`);
  } finally {
    core.info('Ação concluída.');
  }
}

run();
