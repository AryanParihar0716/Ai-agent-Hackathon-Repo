// ────────────────────────────────────────────────────────────
//  GitHub Service — Octokit wrapper for diff retrieval,
//  inline review comments, and automated fix PR creation.
// ────────────────────────────────────────────────────────────

import { Octokit } from 'octokit';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// ─── Diff Retrieval ──────────────────────────────────────

/**
 * Fetch the raw unified diff for a pull request.
 * Returns a plain-text diff string.
 */
export async function fetchPRDiff(owner, repo, pull_number) {
  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number,
    mediaType: { format: 'diff' },
  });
  return data;                // raw diff string
}

// ─── Inline Review Comments ─────────────────────────────

/**
 * Post a review with inline comments on a pull request.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {number} pull_number
 * @param {string} commit_id   — HEAD SHA of the PR
 * @param {Array}  findings    — analyzer output objects
 */
export async function postReviewComments(owner, repo, pull_number, commit_id, findings) {
  if (!findings.length) return;

  const comments = findings.map((f) => ({
    path: f.file,
    line: f.line,
    side: 'RIGHT',
    body: `**🛡️ CodePulse [${f.severity}]** — _${f.category}_\n\n${f.comment}\n\n\`\`\`suggestion\n${f.fixedCode}\n\`\`\``,
  }));

  await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number,
    commit_id,
    event: 'COMMENT',
    body: `## 🔍 CodePulse AI Review\n\nFound **${findings.length}** issue(s) in this PR. Inline annotations are attached below.\n\nAn automated fix PR will be opened shortly.`,
    comments,
  });

  console.log(`[GitHub] Posted review with ${comments.length} inline comment(s)`);
}

// ─── Automated Fix PR ───────────────────────────────────

/**
 * Create a fix branch, commit corrected files, and open a PR.
 *
 * Uses the GitHub Contents API (no local git clone required).
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} baseBranch   — the branch the original PR targets
 * @param {string} baseSha      — the HEAD commit SHA of that branch
 * @param {number} originalPR   — original PR number (for title)
 * @param {Array}  fixes        — [{ file, fixedCode }]
 */
export async function createFixPR(owner, repo, baseBranch, baseSha, originalPR, fixes) {
  if (!fixes.length) return null;

  const fixBranch = `codepulse/auto-fix-pr-${originalPR}-${Date.now()}`;

  // 1 ── Create the fix branch from the base branch HEAD
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${fixBranch}`,
    sha: baseSha,
  });

  // 2 ── For each fix, read the current file then update it
  for (const fix of fixes) {
    try {
      // Get current file content + sha (needed for update)
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: fix.file,
        ref: fixBranch,
      });

      // Decode file, apply the line-level fix
      const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
      const lines = currentContent.split('\n');

      // Replace the specific line with the fix
      if (fix.line >= 1 && fix.line <= lines.length) {
        lines[fix.line - 1] = fix.fixedCode;
      }

      const updatedContent = lines.join('\n');

      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: fix.file,
        message: `fix: CodePulse auto-fix for ${fix.file}:${fix.line}`,
        content: Buffer.from(updatedContent).toString('base64'),
        sha: fileData.sha,
        branch: fixBranch,
      });
    } catch (err) {
      console.error(`[GitHub] Could not patch ${fix.file}: ${err.message}`);
    }
  }

  // 3 ── Open the pull request
  const { data: pr } = await octokit.rest.pulls.create({
    owner,
    repo,
    title: `[CodePulse] Auto-fix for PR #${originalPR}`,
    head: fixBranch,
    base: baseBranch,
    body: [
      '## 🤖 Automated Fix by CodePulse Engine',
      '',
      `This PR contains AI-generated fixes for issues found in PR #${originalPR}.`,
      '',
      '**Review carefully before merging.** Merging this PR will restore the health score on the dashboard.',
      '',
      '---',
      '_Powered by Claude claude-sonnet-4-20250514 + CodePulse Engine_',
    ].join('\n'),
  });

  console.log(`[GitHub] Opened fix PR #${pr.number}: ${pr.html_url}`);
  return pr;
}
