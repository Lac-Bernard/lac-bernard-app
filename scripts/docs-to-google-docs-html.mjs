/**
 * Renders docs/*.md to docs/google-docs/*.html for copy-paste into Google Docs.
 * Run: npm run docs:google-docs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const docsDir = path.join(root, 'docs');
const outDir = path.join(docsDir, 'google-docs');

const sources = [
	{ in: 'member-system-launch-welcome.md', out: 'member-system-launch-welcome.html', title: 'Member system launch: welcome (EN)', lang: 'en' },
	{ in: 'member-system-launch-welcome.fr.md', out: 'member-system-launch-welcome-fr.html', title: 'Lancement espace membre : bienvenue (FR)', lang: 'fr' },
	{ in: 'member-membership-guide.md', out: 'member-membership-guide.html', title: 'Member account guide (EN)', lang: 'en' },
	{ in: 'member-membership-guide.fr.md', out: 'member-membership-guide-fr.html', title: 'Guide du compte membre (FR)', lang: 'fr' },
	{ in: 'admin-membership-guide.md', out: 'admin-membership-guide.html', title: 'Membership admin guide (EN)', lang: 'en' },
	{ in: 'admin-membership-guide.fr.md', out: 'admin-membership-guide-fr.html', title: "Guide d'administration des adhésions (FR)", lang: 'fr' },
];

marked.setOptions({ gfm: true });

const shell = `<!DOCTYPE html>
<html lang="{{LANG}}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{TITLE}}</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #202124;
      max-width: 40rem;
      margin: 1.5rem auto;
      padding: 0 1rem 3rem;
    }
    h1 { font-size: 18pt; margin: 1.25rem 0 0.5rem; font-weight: 700; }
    h2 { font-size: 14pt; margin: 1.25rem 0 0.5rem; font-weight: 700; border-bottom: 1px solid #dadce0; padding-bottom: 0.2rem; }
    h3 { font-size: 12pt; margin: 1rem 0 0.35rem; font-weight: 700; }
    p { margin: 0.5rem 0; }
    ul, ol { margin: 0.5rem 0; padding-left: 1.5rem; }
    li { margin: 0.2rem 0; }
    hr { border: none; border-top: 1px solid #dadce0; margin: 1.25rem 0; }
    a { color: #1a73e8; }
    code { font-family: "Consolas", "Menlo", monospace; font-size: 10pt; background: #f1f3f4; padding: 0.1em 0.35em; border-radius: 3px; }
    strong { font-weight: 700; }
    em { font-style: italic; }
    blockquote { margin: 0.5rem 0; padding-left: 1rem; border-left: 3px solid #dadce0; color: #5f6368; }
  </style>
</head>
<body>
{{BODY}}
</body>
</html>
`;

fs.mkdirSync(outDir, { recursive: true });

for (const { in: inName, out: outName, title, lang } of sources) {
	const inPath = path.join(docsDir, inName);
	if (!fs.existsSync(inPath)) {
		console.warn('skip missing:', inName);
		continue;
	}
	const md = fs.readFileSync(inPath, 'utf8');
	const body = marked.parse(md);
	const html = shell
		.replace('{{LANG}}', lang)
		.replace('{{TITLE}}', title)
		.replace('{{BODY}}', body);
	const outPath = path.join(outDir, outName);
	fs.writeFileSync(outPath, html, 'utf8');
	console.log('wrote', path.relative(root, outPath));
}
