const core = require('@actions/core');
const github = require('@actions/github');
const { MESSAGES, generatePRCommentMessage } = require('../lib/constants');
const { callGemini } = require('./requests/gemini');
const { buildTitlePrompt, buildDescriptionPrompt } = require('./utils/prompts');
const { getPullRequestData } = require('./requests/github');
const { hasLabel, loadCustomTemplate, titleSysInstruction, descriptionSysInstruction } = require('./utils/helpers');

async function run() {
  try {
    core.info('Starting PR check and AI generation...');
    
    const token = core.getInput('github-token', { required: true });
    const customToken = core.getInput('custom-token') || token;
    const geminiKey = core.getInput('gemini-token');
    const language = core.getInput('language') || 'pt';
    const customTemplatePath = core.getInput('custom-pr-template-path');
    
    const msgTexts = MESSAGES[language] || MESSAGES.pt;
    
    core.info('Tokens obtained, initializing octokit...');
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
        core.warning(`Error listing PRs: ${prListError.message}`);
      }
    }

    if (!pr) {
      core.info("No PR found to verify.");
      return;
    }

    const { owner, repo } = github.context.repo;
    const prNumber = pr.number;
    const labels = pr.labels || [];

    // AI Generation Logic
    const generateTitle = hasLabel(labels, 'generate-title') || hasLabel(labels, 'generate-full-pr');
    const generateDescription = hasLabel(labels, 'generate-description') || hasLabel(labels, 'generate-full-pr');
    
    let aiUpdates = {};
    let aiGenerationPerformed = false;

    if ((generateTitle || generateDescription) && geminiKey) {
      core.info('AI generation labels detected, proceeding with AI generation...');
      
      try {
        const { commitMessages, modifiedFiles } = await getPullRequestData(octokit, owner, repo, prNumber);
        const customTemplate = loadCustomTemplate(customTemplatePath);

        if (generateTitle) {
          const prompt = buildTitlePrompt(commitMessages);
          aiUpdates.title = await callGemini(prompt, geminiKey, titleSysInstruction);
          core.info(`✅ New AI-generated title: ${aiUpdates.title}`);
          aiGenerationPerformed = true;
        }

        if (generateDescription) {
          const prompt = buildDescriptionPrompt(modifiedFiles, customTemplate);
          aiUpdates.body = await callGemini(prompt, geminiKey, descriptionSysInstruction, 500);
          core.info(`📝 New AI-generated description created.`);
          aiGenerationPerformed = true;
        }

        // Update PR with AI-generated content
        if (Object.keys(aiUpdates).length > 0) {
          await octokit.rest.pulls.update({
            owner,
            repo,
            pull_number: prNumber,
            ...aiUpdates,
          });
          core.info('🤖 PR updated with AI-generated content!');
        }

      } catch (aiError) {
        core.error(`Error during AI generation: ${aiError.message}`);
        // Continue with validation even if AI generation fails
      }
    } else if (generateTitle || generateDescription) {
      core.warning('AI generation labels detected but gemini-token not provided. Skipping AI generation.');
    }

    // PR Validation Logic
    core.info('Verifying required PR fields...');
    const missingFields = [];

    // Re-fetch PR data if it was updated by AI to get latest state
    if (aiGenerationPerformed) {
      try {
        const { data: updatedPR } = await octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: prNumber
        });
        pr = updatedPR;
        core.info('PR data refreshed after AI updates');
      } catch (refreshError) {
        core.warning(`Could not refresh PR data: ${refreshError.message}`);
      }
    }

    if (!pr.milestone) {
      missingFields.push(msgTexts.milestoneMissing);
      core.info('Milestone missing');
    }

    if (!pr.assignees || pr.assignees.length === 0) {
      missingFields.push(msgTexts.assigneesMissing);
      core.info('Assignees missing');
    }

    if (!pr.labels || pr.labels.length === 0) {
      missingFields.push(msgTexts.labelsMissing);
      core.info('Labels missing');
    }

    // Handle validation results
    if (missingFields.length > 0) {
      const message = generatePRCommentMessage(msgTexts, missingFields);
      
      core.info('Missing required fields detected, adding comment...');
      
      try {
        core.info(`Creating validation comment on PR #${pr.number}`);
        
        await commentOctokit.rest.issues.createComment({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          issue_number: pr.number,
          body: message
        });
        
        core.info('Validation comment added successfully');
        
        if (aiGenerationPerformed) {
          core.setFailed("PR updated with AI content but is still incomplete. See the added comment for missing fields.");
        } else {
          core.setFailed("PR is incomplete. See the added comment for missing fields.");
        }
        
      } catch (commentError) {
        core.error(`Error creating validation comment: ${commentError.message}`);
        if (commentError.message.includes('Resource not accessible by integration')) {
          core.error('PERMISSION ERROR: Check if the token has permission to write in issues/pull requests');
          core.error('Add "permissions: { issues: write, pull-requests: write }" to your workflow file');
        }
        core.setFailed(`Unable to add validation comment: ${commentError.message}`);
      }
    } else {
      if (aiGenerationPerformed) {
        core.info(`🎉 PR #${pr.number} updated with AI content and has all required fields!`);
      } else {
        core.info(`✅ PR #${pr.number} has all required fields filled.`);
      }
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