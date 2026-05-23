// ────────────────────────────────────────────────────────────
//  Webhook Route — handles incoming GitHub pull_request events.
//
//  Supported actions:
//    • opened / synchronize  → run AI review pipeline
//    • closed (merged)       → check if it's a CodePulse fix PR
// ────────────────────────────────────────────────────────────

import { Router } from 'express';
import { fetchPRDiff, postReviewComments, createFixPR } from '../services/github.js';
import { analyzeDiff, computeScore } from '../services/analyzer.js';
import { broadcastScore, getScore } from '../services/broadcaster.js';

const router = Router();

// ─── POST /webhook ──────────────────────────────────────

router.post('/', async (req, res) => {
  const event = req.headers['x-github-event'];

  // Only process pull_request events
  if (event !== 'pull_request') {
    console.log(`[Webhook] Ignored event: ${event}`);
    return res.status(200).json({ status: 'ignored', event });
  }

  const { action, pull_request: pr, repository } = req.body;
  const owner = repository.owner.login;
  const repo = repository.name;
  const pull_number = pr.number;

  console.log(`[Webhook] pull_request.${action} → ${owner}/${repo}#${pull_number}`);

  // ── Fix PR merged → broadcast REMEDIATION_RESOLVED ──
  if (action === 'closed' && pr.merged) {
    if (pr.title.startsWith('[CodePulse]')) {
      console.log('[Webhook] CodePulse fix PR merged! Broadcasting remediation…');
      broadcastScore(100, { action: 'REMEDIATION_RESOLVED' });
      return res.status(200).json({ status: 'remediation_resolved' });
    }
    return res.status(200).json({ status: 'closed_ignored' });
  }

  // ── Only run the pipeline for opened or synchronize ──
  if (action !== 'opened' && action !== 'synchronize') {
    return res.status(200).json({ status: 'action_ignored', action });
  }

  // Respond immediately so GitHub doesn't time out, then process async
  res.status(202).json({ status: 'processing' });

  try {
    // 1 ── Fetch the PR diff
    console.log('[Pipeline] Fetching PR diff…');
    const diff = await fetchPRDiff(owner, repo, pull_number);

    if (!diff || typeof diff !== 'string' || diff.trim().length === 0) {
      console.log('[Pipeline] Empty diff — nothing to review.');
      return;
    }

    // 2 ── Analyze with Claude
    console.log('[Pipeline] Analyzing diff with Claude…');
    const findings = await analyzeDiff(diff);

    if (!findings.length) {
      console.log('[Pipeline] No issues found — clean PR!');
      broadcastScore(getScore(), {
        title: pr.title,
        repo: `${owner}/${repo}`,
        defectCount: 0,
        peakSeverity: 'NONE',
        categories: [],
      });
      return;
    }

    // 3 ── Compute score
    const score = computeScore(findings);
    const peakSeverity = findings.some(f => f.severity === 'CRITICAL')
      ? 'CRITICAL'
      : findings.some(f => f.severity === 'WARNING')
        ? 'WARNING'
        : 'INFO';
    const categories = findings.map(f => f.category);

    // 4 ── Post inline review comments on the PR
    console.log('[Pipeline] Posting inline review comments…');
    await postReviewComments(owner, repo, pull_number, pr.head.sha, findings);

    // 5 ── Create automated fix PR
    console.log('[Pipeline] Creating automated fix PR…');
    const fixes = findings
      .filter(f => f.fixedCode && f.file && f.line)
      .map(f => ({ file: f.file, line: f.line, fixedCode: f.fixedCode }));

    if (fixes.length) {
      // Get the base branch SHA for branching
      const baseBranch = pr.base.ref;
      const baseSha = pr.base.sha;
      await createFixPR(owner, repo, baseBranch, baseSha, pull_number, fixes);
    }

    // 6 ── Broadcast score to dashboard
    broadcastScore(score, {
      title: pr.title,
      repo: `${owner}/${repo}`,
      defectCount: findings.length,
      peakSeverity,
      categories,
    });

    console.log('[Pipeline] ✅ Review pipeline complete');
  } catch (err) {
    console.error('[Pipeline] ❌ Error during review pipeline:', err);
  }
});

export default router;
