const core = require('@actions/core');
const github = require('@actions/github');

class PRValidator {
  constructor(octokit, commentOctokit, msgTexts) {
    this.octokit = octokit;
    this.commentOctokit = commentOctokit;
    this.msgTexts = msgTexts;
  }

  async validate(pr) {
    core.info('Verificando campos obrigatórios do PR...');
    const missingFields = this.checkRequiredFields(pr);

    if (missingFields.length > 0) {
      await this.handleMissingFields(pr, missingFields);
    } else {
      core.info(`✅ PR #${pr.number} possui todos os campos obrigatórios preenchidos.`);
    }
  }

  checkRequiredFields(pr) {
    const missingFields = [];

    if (!pr.milestone) {
      missingFields.push(this.msgTexts.milestoneMissing);
      core.info('Milestone não encontrada');
    }

    if (!pr.assignees || pr.assignees.length === 0) {
      missingFields.push(this.msgTexts.assigneesMissing);
      core.info('Assignees não encontrados');
    }

    if (!pr.labels || pr.labels.length === 0) {
      missingFields.push(this.msgTexts.labelsMissing);
      core.info('Labels não encontradas');
    }

    return missingFields;
  }

  async handleMissingFields(pr, missingFields) {
    const message = this.generateCommentMessage(missingFields);
    
    core.info('Campos obrigatórios faltando, tentando adicionar comentário...');
    
    try {
      await this.addComment(pr, message);
      core.warning("PR está incompleto. Veja o comentário adicionado.");
    } catch (error) {
      this.handleCommentError(error);
    }
  }

  generateCommentMessage(missingFields) {
    return `## ⚠️ Campos Obrigatórios Faltando

Por favor, preencha os seguintes campos obrigatórios para prosseguir:

${missingFields.join('\n')}

Após preencher os campos, você pode:
1. Adicionar a label \`generate-title\` para gerar um título
2. Adicionar a label \`generate-description\` para gerar uma descrição
3. Adicionar a label \`generate-full-pr\` para gerar título e descrição`;
  }

  async addComment(pr, message) {
    core.info(`Criando comentário no PR #${pr.number}`);
    core.info(`Proprietário do repositório: ${github.context.repo.owner}`);
    core.info(`Nome do repositório: ${github.context.repo.repo}`);
    
    await this.commentOctokit.rest.issues.createComment({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: pr.number,
      body: message
    });
    
    core.info('Comentário adicionado com sucesso');
  }

  handleCommentError(error) {
    core.error(`Erro ao criar comentário: ${error.message}`);
    if (error.message.includes('Resource not accessible by integration')) {
      core.error('ERRO DE PERMISSÃO: Verifique se o token tem permissão para escrever em issues/pull requests');
      core.error('Adicione "permissions: { issues: write, pull-requests: write }" ao seu arquivo de workflow');
    }
    core.setFailed(`Não foi possível adicionar o comentário: ${error.message}`);
  }
}

module.exports = PRValidator; 