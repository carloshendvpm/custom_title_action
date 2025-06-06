async function getPullRequestData(octokit, owner, repo, prNumber) {
  const [commitsRes, filesRes] = await Promise.all([
    octokit.rest.pulls.listCommits({ owner, repo, pull_number: prNumber }),
    octokit.rest.pulls.listFiles({ owner, repo, pull_number: prNumber })
  ]);

  const commitMessages = commitsRes.data.map(c => c.commit.message).join('\n');
  const modifiedFiles = filesRes.data.map(f => f.filename).join('\n');
  return { commitMessages, modifiedFiles };
}

module.exports = { getPullRequestData };
