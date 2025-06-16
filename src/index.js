const core = require('@actions/core');
const github = require('@actions/github');
const { MESSAGES } = require('./utils/constants');
const PRValidator = require('./validators/PRValidator');
const PRContentGenerator = require('./generators/PRContentGenerator');

async function findPR(octokit) {
  if (github.context.payload.pull_request) {
    return github.context.payload.pull_request;
  }

  if (github.context.eventName === 'push') {
    return await findPRByCommit(octokit);
  }

  return null;
}

async function findPRByCommit(octokit) {
  core.info('Evento de push detectado, procurando PRs associados...');
  const sha = github.context.sha;

  try {
    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      state: 'open'
    });

    core.info(`Encontrados ${pullRequests.length} PRs abertos no repositório`);

    for (const pullRequest of pullRequests) {
      const pr = await findPRWithCommit(octokit, pullRequest, sha);
      if (pr) return pr;
    }
  } catch (error) {
    core.warning(`Erro ao listar PRs: ${error.message}`);
  }

  return null;
}

async function findPRWithCommit(octokit, pullRequest, sha) {
  core.info(`Verificando commits do PR #${pullRequest.number}...`);
  try {
    const { data: commits } = await octokit.rest.pulls.listCommits({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: pullRequest.number
    });

    core.info(`PR #${pullRequest.number} tem ${commits.length} commits`);

    if (commits.some(commit => commit.sha === sha)) {
      core.info(`PR #${pullRequest.number} encontrado relacionado ao commit ${sha}`);
      return pullRequest;
    }
  } catch (error) {
    core.warning(`Erro ao buscar commits do PR #${pullRequest.number}: ${error.message}`);
  }

  return null;
}

async function run() {
  try {
    core.info('Iniciando verificação do PR...');
    const token = core.getInput('github-token');
    const customToken = core.getInput('custom-token') || token;
    const language = core.getInput('language') || 'pt';
    const msgTexts = MESSAGES[language] || MESSAGES.pt;
    const geminiKey = core.getInput('gemini-token');
    const customTemplatePath = core.getInput('custom-pr-template-path');

    core.info('Token obtido, inicializando octokit...');
    const octokit = github.getOctokit(token);
    const commentOctokit = customToken !== token ? github.getOctokit(customToken) : octokit;

    const pr = await findPR(octokit);
    if (!pr) {
      core.info("Nenhum PR encontrado para verificar.");
      return;
    }

    const validator = new PRValidator(octokit, commentOctokit, msgTexts);
    const fieldsAreValid = await validator.validate(pr);

    if (fieldsAreValid && geminiKey) {
      const generator = new PRContentGenerator(octokit, geminiKey, customTemplatePath);
      await generator.generate(pr);
    } else if (!fieldsAreValid) {
      core.setFailed("PR está incompleto. Por favor, preencha todos os campos obrigatórios.");
    }

  } catch (error) {
    core.error(`Erro ao executar action: ${error.message}`);
    if (error.stack) {
      core.debug(`Stack trace: ${error.stack}`);
    }
    core.setFailed(error.message);
  }
}

run();
