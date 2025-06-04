const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');

async function run(){
  try {
    const githubToken = core.getInput('github-token');
    const geminiKey = core.getInput('gemini-token');
    const octokit = github.getOctokit(githubToken);
    const context = github.context;
    let pr = context.payload.pull_request;
    if (!pr) {
      core.setFailed('This action can only be run on pull requests.');
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

    const prompt = `Gere um título breve e descritivo para um Pull Request com base nessas mensagens de commit:\n\n${commitMessages}`;
    
    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      }
    );

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
  }
  finally {
    core.info('Ação concluída.');
  }
}

run();