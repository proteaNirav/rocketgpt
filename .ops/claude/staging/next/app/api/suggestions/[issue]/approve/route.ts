import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

const [OWNER, REPO] = (process.env.GITHUB_REPOSITORY || '').split('/');

export async function POST(req: NextRequest, { params }: { params: { issue: string } }) {
  if (!process.env.GH_PAT || !OWNER || !REPO) {
    return NextResponse.json({ ok: false, error: 'server not configured' }, { status: 500 });
  }
  const ***REMOVED***'x-admin-token');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const issue_number = Number(params.issue);
  const ***REMOVED*** Octokit({ auth: process.env.GH_PAT });

  await gh.rest.issues.addLabels({
    owner: OWNER, repo: REPO, issue_number,
    labels: ['approved', 'self-apply', 'codegen:ready']
  });
  await gh.rest.issues.removeLabel({
    owner: OWNER, repo: REPO, issue_number, name: 'suggestion:pending'
  }).catch(() => {});

  await gh.rest.issues.createComment({
    owner: OWNER, repo: REPO, issue_number,
    body: '✅ Approved by moderator. Launching codegen pipeline…'
  });

  return NextResponse.json({ ok: true });
}
