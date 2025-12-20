import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

const [OWNER, REPO] = (process.env.GITHUB_REPOSITORY || '').split('/');

export async function POST(req: NextRequest, { params }: { params: { issue: string } }) {
  if (!process.env.GH_PAT || !OWNER || !REPO) {
    return NextResponse.json({ ok: false, error: 'server not configured' }, { status: 500 });
  }
  const token = req.headers.get('x-admin-token');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { reason } = await req.json().catch(() => ({ reason: '' }));
  const issue_number = Number(params.issue);
  const gh = new Octokit({ auth: process.env.GH_PAT });

  await gh.rest.issues.addLabels({
    owner: OWNER, repo: REPO, issue_number,
    labels: ['rejected']
  });
  await gh.rest.issues.removeLabel({
    owner: OWNER, repo: REPO, issue_number, name: 'suggestion:pending'
  }).catch(() => {});

  await gh.rest.issues.createComment({
    owner: OWNER, repo: REPO, issue_number,
    body: `❌ Rejected by moderator.${reason ? `\n\n**Reason:** ${reason}` : ''}`
  });

  return NextResponse.json({ ok: true });
}

