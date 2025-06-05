const core = require('@actions/core');
const github = require('@actions/github');
const { callGemini } = require('./gemini');
const { buildTitlePrompt, buildDescriptionPrompt } = require('./prompts');
const { getPullRequestData } = require('./github');
const { hasLabel, loadCustomTemplate } = require('./helpers');

async function run() {
  try {
    const githubToken = core.getInput('github-token', { required: true });
    const geminiKey = core.getInput('gemini-token', { required: true });
    const customTemplatePath = core.getInput('custom-pr-template-path');

    const octokit = github.getOctokit(githubToken);
    const context = github.context;
    const pr = context.payload.pull_request;

    if (!pr) return core.setFailed('A ação deve ser executada em um PR.');

    const { owner, repo } = context.repo;
    const prNumber = pr.number;
    const labels = pr.labels;

    const generateTitle = hasLabel(labels, 'generate-title') || hasLabel(labels, 'generate-full-pr');
    const generateDescription = hasLabel(labels, 'generate-description') || hasLabel(labels, 'generate-full-pr');

    if (!generateTitle && !generateDescription) {
      return core.info('Nenhuma label de geração detectada.');
    }

    const { commitMessages, modifiedFiles } = await getPullRequestData(octokit, owner, repo, prNumber);

    const customTemplate = loadCustomTemplate(customTemplatePath);

    const updates = {};

    if (generateTitle) {
      const prompt = buildTitlePrompt(commitMessages);
      updates.title = await callGemini(prompt, geminiKey);
      core.info(`✅ Novo título: ${updates.title}`);
    }

    if (generateDescription) {
      const prompt = buildDescriptionPrompt(modifiedFiles, customTemplate);
      updates.body = await callGemini(prompt, geminiKey);
      core.info(`📝 Nova descrição gerada.`);
    }

    await octokit.rest.pulls.update({
      owner,
      repo,
      pull_number: prNumber,
      ...updates,
    });

    core.info('🎉 PR atualizado com sucesso!');
  } catch (error) {
    core.setFailed(`Erro: ${error.message}`);
  }
}

run();
