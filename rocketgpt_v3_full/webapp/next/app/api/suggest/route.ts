import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import nodemailer from 'nodemailer';

type SuggestReq = {
  title: string;
  description?: string;
  contactEmail?: string;
  url?: string;
  engine?: string;
};

const ownerRepo = process.env.GITHUB_REPOSITORY || '';
const [OWNER, REPO] = ownerRepo.split('/');

function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status: code });
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GH_PAT || !OWNER || !REPO) {
      return bad('Server not configured (GH_PAT / GITHUB_REPOSITORY).', 500);
    }

    const body = (await req.json()) as SuggestReq;
    const title = (body.title || '').trim();
    if (!title) return bad('Title is required');
    const engine = (body.engine || process.env.DEFAULT_ENGINE || 'openai').toLowerCase();

    const lines: string[] = [];
    lines.push('## ðŸ’¡ Anonymous Feature Suggestion');
    if (body.description) lines.push(body.description);
    lines.push('');
    lines.push('---');
    lines.push(`**Engine hint:** \`${engine}\``);
    if (body.url) lines.push(`**Source URL:** ${body.url}`);
    if (body.contactEmail) lines.push(`**Contact (optional):** ${body.contactEmail}`);
    lines.push('\n<!--meta\n' + JSON.stringify({ engine, url: body.url || '', contactEmail: body.contactEmail || '' }) + '\n-->');

    const gh = new Octokit({ auth: process.env.GH_PAT });
    const { data: issue } = await gh.rest.issues.create({
      owner: OWNER,
      repo: REPO,
      title,
      body: lines.join('\n'),
      labels: ['suggestion:pending', 'from:web']
    });

    // Optional email notification
    if (process.env.SMTP_HOST && process.env.NOTIFY_TO) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: false,
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        });
        await transporter.sendMail({
          from: process.env.SMTP_USER || 'noreply@rocketgpt',
          to: process.env.NOTIFY_TO,
          subject: `New suggestion: #${issue.number} "” ${title}`,
          text: `A new suggestion is awaiting review:\n${issue.html_url}\n\n${body.description || ''}`,
        });
      } catch { /* ignore */ }
    }

    return NextResponse.json({ ok: true, issue_number: issue.number, issue_url: issue.html_url });
  } catch {
    return bad('Unexpected error.', 500);
  }
}
