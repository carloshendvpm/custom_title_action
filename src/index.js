const core = require('@actions/core');
const github = require('@actions/github');
const { MESSAGES, generatePRCommentMessage } = require('./utils/constants');
const { callGemini } = require('./requests/gemini');
const { buildTitlePrompt, buildDescriptionPrompt } = require('./utils/prompts');
const { getPullRequestData } = require('./requests/github');
const { hasLabel, loadCustomTemplate, titleSysInstruction, descriptionSysInstruction } = require('./utils/helpers');

async function checkPRFields(pr, octokit, commentOctokit, msgTexts) {
  core.info('Verifying required PR fields...');
  const missingFields = [];

  if (!pr.milestone) {
    missingFields.push(msgTexts.milestoneMissing);
    core.info('Milestone not found');
  }

  if (!pr.assignees || pr.assignees.length === 0) {
    missingFields.push(msgTexts.assigneesMissing);
    core.info('Assignees not found');
  }

  if (!pr.labels || pr.labels.length === 0) {
    missingFields.push(msgTexts.labelsMissing);
    core.info('Labels not found');
  }

  if (missingFields.length > 0) {
    const message = generatePRCommentMessage(msgTexts, missingFields);
    
    core.info('Missing required fields, trying to add comment...');
    
    try {
      core.info(`Creating comment on PR #${pr.number}`);
      core.info(`Repository owner: ${github.context.repo.owner}`);
      core.info(`Repository name: ${github.context.repo.repo}`);
      
      await commentOctokit.rest.issues.createComment({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: pr.number,
        body: message
      });
      
      core.info('Comment added successfully');
      core.setFailed("PR is incomplete. See the added comment.");
      return false;
    } catch (commentError) {
      core.error(`Error creating comment: ${commentError.message}`);
      if (commentError.message.includes('Resource not accessible by integration')) {
        core.error('PERMISSION ERROR: Check if the token has permission to write in issues/pull requests');
        core.error('Add "permissions: { issues: write, pull-requests: write }" to your workflow file');
      }
      core.setFailed(`Unable to add comment: ${commentError.message}`);
      return false;
    }
  } else {
    core.info(`✅ PR #${pr.number} has all required fields filled.`);
    return true;
  }
}

async function generatePRContent(pr, octokit, geminiKey, customTemplatePath) {
  const { owner, repo } = github.context.repo;
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
    updates.title = await callGemini(prompt, geminiKey, titleSysInstruction);
    core.info(`✅ Novo título: ${updates.title}`);
  }

  if (generateDescription) {
    const prompt = buildDescriptionPrompt(modifiedFiles, customTemplate);
    updates.body = await callGemini(prompt, geminiKey, descriptionSysInstruction, 500);
    core.info(`📝 Nova descrição gerada.`);
  }

  await octokit.rest.pulls.update({
    owner,
    repo,
    pull_number: prNumber,
    ...updates,
  });

  core.info('🎉 PR atualizado com sucesso!');
}

async function run() {
  try {
    core.info('Starting PR check...');
    const token = core.getInput('github-token');
    const customToken = core.getInput('custom-token') || token;
    const language = core.getInput('language') || 'pt';
    const msgTexts = MESSAGES[language] || MESSAGES.pt;
    const geminiKey = core.getInput('gemini-token');
    const customTemplatePath = core.getInput('custom-pr-template-path');
    
    core.info('Token obtained, initializing octokit...');
    const octokit = github.getOctokit(token);
    const commentOctokit = customToken !== token ? github.getOctokit(customToken) : octokit;    
    core.info(`Event context: ${github.context.eventName}`);
    core.info(`Repository: ${github.context.repo.owner}/${github.context.repo.repo}`);
    
    let pr;
    
    if (github.context.payload.pull_request) {
      pr = github.context.payload.pull_request;
      core.info(`Processing pull request #${pr.number}`);
    } 
    else if (github.context.eventName === 'push') {
      core.info('Push event detected, searching for associated PRs...');
      
      const sha = github.context.sha;
      core.info(`Current commit SHA: ${sha}`);
      
      try {
        const { data: pullRequests } = await octokit.rest.pulls.list({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          state: 'open'
        });
        
        core.info(`Found ${pullRequests.length} open PRs in the repository`);
        
        for (const pullRequest of pullRequests) {
          core.info(`Checking commits of PR #${pullRequest.number}...`);
          try {
            const { data: commits } = await octokit.rest.pulls.listCommits({
              owner: github.context.repo.owner,
              repo: github.context.repo.repo,
              pull_number: pullRequest.number
            });
            
            core.info(`PR #${pullRequest.number} has ${commits.length} commits`);
            
            if (commits.some(commit => commit.sha === sha)) {
              pr = pullRequest;
              core.info(`Found PR #${pr.number} related to commit ${sha}`);
              break;
            }
          } catch (commitError) {
            core.warning(`Error searching commits for PR #${pullRequest.number}: ${commitError.message}`);
          }
        }
      } catch (prListError) {
        core.warning(`Erro ao listar PRs: ${prListError.message}`);
      }
    }

    if (!pr) {
      core.info("No PR found to verify.");
      return;
    }

    const fieldsAreValid = await checkPRFields(pr, octokit, commentOctokit, msgTexts);
    if (fieldsAreValid && geminiKey) {
      await generatePRContent(pr, octokit, geminiKey, customTemplatePath);
    }

  } catch (error) {
    core.error(`Error executing action: ${error.message}`);
    if (error.stack) {
      core.debug(`Stack trace: ${error.stack}`);
    }
    core.setFailed(error.message);
  }
}

run();
