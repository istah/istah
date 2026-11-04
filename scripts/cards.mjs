// Two year-over-year cards (activity, languages), same look and size as the github-readme-stats cards.
// Counts and percentages only, no repo names. Needs GITHUB_TOKEN and GITHUB_REPOSITORY_OWNER.
import { writeFileSync } from 'node:fs';

const login = process.env.GITHUB_REPOSITORY_OWNER;
const token = process.env.GITHUB_TOKEN;
const now = new Date();
const year = now.getUTCFullYear();
const years = [year - 1, year];

async function load(y) {
  const query = `{ user(login:"${login}") { contributionsCollection(from:"${y}-01-01T00:00:00Z", to:"${y}-12-31T23:59:59Z") {
    totalCommitContributions restrictedContributionsCount totalPullRequestContributions
    totalIssueContributions totalPullRequestReviewContributions totalRepositoryContributions
    commitContributionsByRepository(maxRepositories:100) { repository { primaryLanguage { name } } contributions { totalCount } } } } }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(JSON.stringify(body.errors || res.status));
  return body.data.user.contributionsCollection;
}

const [a, b] = await Promise.all(years.map(load));
const fmt = (n) => Number(n).toLocaleString('en-US');
const rows = [
  ['Commits (public)', 'totalCommitContributions'],
  ['Private contributions', 'restrictedContributionsCount'],
  ['Pull requests', 'totalPullRequestContributions'],
  ['Issues', 'totalIssueContributions'],
  ['Code reviews', 'totalPullRequestReviewContributions'],
  ['New repositories', 'totalRepositoryContributions'],
];

const text = rows
  .map(([label, key], i) => {
    const y = 76 + i * 16;
    return `<text x="25" y="${y}" class="l">${label}</text>
  <text x="330" y="${y}" class="v" text-anchor="end">${fmt(a[key])}</text>
  <text x="430" y="${y}" class="v" text-anchor="end">${fmt(b[key])}</text>`;
  })
  .join('\n  ');

const svg = `<svg width="467" height="190" viewBox="0 0 467 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Contributions ${years[0]} vs ${years[1]}">
  <style>
    .t { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: #2f80ed }
    .h { font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #2f80ed }
    .l { font: 400 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #434d58 }
    .v { font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #434d58 }
    .n { font: 400 10px 'Segoe UI', Ubuntu, Sans-Serif; fill: #8b949e }
  </style>
  <rect x="0.5" y="0.5" rx="4.5" width="466" height="189" fill="#fffefe"/>
  <text x="25" y="35" class="t">Year over year</text>
  <text x="330" y="58" class="h" text-anchor="end">${years[0]}</text>
  <text x="430" y="58" class="h" text-anchor="end">${years[1]} (to date)</text>
  ${text}
  <text x="25" y="180" class="n">Counts from GitHub contributions. Private work is counted, never named.</text>
</svg>
`;
writeFileSync('profile/yoy.svg', svg);

// ---- languages: share of commits by each repository's primary language (public repos)
const COLORS = { JavaScript: '#f1e05a', Python: '#3572A5', Dart: '#00B4AB', HTML: '#e34c26', TypeScript: '#3178c6', CSS: '#563d7c', Java: '#b07219', Other: '#8b949e' };
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function shares(c) {
  const by = {};
  for (const r of c.commitContributionsByRepository) {
    const l = r.repository.primaryLanguage?.name || 'Other';
    by[l] = (by[l] || 0) + r.contributions.totalCount;
  }
  const total = Object.values(by).reduce((x, y) => x + y, 0) || 1;
  return Object.entries(by).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([l, n]) => [l, (n / total) * 100]);
}
const column = (x, label, list) => `<text x="${x}" y="58" class="h">${esc(label)}</text>
  ${list.map(([l, pct], i) => {
    const y = 80 + i * 24;
    return `<text x="${x}" y="${y}" class="l">${esc(l)}</text>
  <text x="${x + 190}" y="${y}" class="v" text-anchor="end">${pct.toFixed(1)}%</text>
  <rect x="${x}" y="${y + 5}" width="190" height="5" rx="2.5" fill="#e4e8ec"/>
  <rect x="${x}" y="${y + 5}" width="${Math.max(2, (pct / 100) * 190).toFixed(1)}" height="5" rx="2.5" fill="${COLORS[l] || '#8b949e'}"/>`;
  }).join('\n  ')}`;
const lang = `<svg width="467" height="190" viewBox="0 0 467 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Languages ${years[0]} versus ${years[1]}">
  <style>
    .t { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: #2f80ed }
    .h { font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #2f80ed }
    .l { font: 400 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #434d58 }
    .v { font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #434d58 }
    .n { font: 400 10px 'Segoe UI', Ubuntu, Sans-Serif; fill: #8b949e }
  </style>
  <rect x="0.5" y="0.5" rx="4.5" width="466" height="189" fill="#fffefe"/>
  <text x="25" y="35" class="t">Languages, year over year</text>
  ${column(25, String(years[0]), shares(a))}
  ${column(250, `${years[1]} (to date)`, shares(b))}
  <text x="25" y="180" class="n">Share of commits to public repositories, by primary language.</text>
</svg>
`;
writeFileSync('profile/languages.svg', lang);
console.log(years.map((y, i) => `${y}: ${JSON.stringify(shares([a, b][i]).map(([l, p]) => `${l} ${p.toFixed(0)}%`))}`).join('\n'));
