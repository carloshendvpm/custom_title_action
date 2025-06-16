const core = require('@actions/core');
const github = require('@actions/github');
const { callGemini } = require('../requests/gemini');
const { buildTitlePrompt, buildDescriptionPrompt } = require('../utils/prompts');
const { getPullRequestData } = require('../requests/github');
const { hasLabel, loadCustomTemplate, titleSysInstruction, descriptionSysInstruction } = require('../utils/helpers');

class PRContentGenerator {
  constructor(octokit, geminiKey, customTemplatePath) {
    this.octokit = octokit;
    this.geminiKey = geminiKey;
    this.customTemplatePath = customTemplatePath;
    this.owner = github.context.repo.owner;
    this.repo = github.context.repo.repo;
  }

  async generate(pr) {
    const { shouldGenerateTitle, shouldGenerateDescription } = this.checkGenerationLabels(pr.labels);

    if (!shouldGenerateTitle && !shouldGenerateDescription) {
      return core.info('Nenhuma label de geração detectada.');
    }

    const { commitMessages, modifiedFiles } = await getPullRequestData(this.octokit, this.owner, this.repo, pr.number);
    const customTemplate = loadCustomTemplate(this.customTemplatePath);
    const updates = {};

    if (shouldGenerateTitle) {
      updates.title = await this.generateTitle(commitMessages);
    }

    if (shouldGenerateDescription) {
      updates.body = await this.generateDescription(modifiedFiles, customTemplate);
    }

    await this.updatePR(pr.number, updates);
  }

  checkGenerationLabels(labels) {
    const generateTitle = hasLabel(labels, 'generate-title') || hasLabel(labels, 'generate-full-pr');
    const generateDescription = hasLabel(labels, 'generate-description') || hasLabel(labels, 'generate-full-pr');

    return { shouldGenerateTitle: generateTitle, shouldGenerateDescription: generateDescription };
  }

  async generateTitle(commitMessages) {
    const prompt = buildTitlePrompt(commitMessages);
    const title = await callGemini(prompt, this.geminiKey, titleSysInstruction);
    core.info(`✅ Novo título: ${title}`);
    return title;
  }

  async generateDescription(modifiedFiles, customTemplate) {
    const prompt = buildDescriptionPrompt(modifiedFiles, customTemplate);
    const description = await callGemini(prompt, this.geminiKey, descriptionSysInstruction, 500);
    core.info(`📝 Nova descrição gerada.`);
    return description;
  }

  async updatePR(prNumber, updates) {
    try {
      await this.octokit.rest.pulls.update({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        ...updates,
      });
      core.info('🎉 PR atualizado com sucesso!');
    } catch (error) {
      core.error(`Erro ao atualizar PR: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PRContentGenerator; 