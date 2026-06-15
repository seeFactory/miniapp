import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');

async function listFiles(dir, extension) {
  try {
    const entries = await readdir(path.join(distDir, dir), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
      .map((entry) => `/${dir}/${entry.name}`)
      .sort();
  } catch {
    return [];
  }
}

const cssFiles = await listFiles('css', '.css');
const jsFiles = await listFiles('js', '.js');

const appEntry = jsFiles.find((file) => file.endsWith('/app.js'));
const scriptFiles = [
  ...jsFiles.filter((file) => file !== appEntry),
  ...(appEntry ? [appEntry] : [])
];

if (!appEntry) {
  throw new Error('H5 build did not emit /js/app.js');
}

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#f7f5f0" />
    <title>seeFactory</title>
${cssFiles.map((file) => `    <link rel="stylesheet" href="${file}" />`).join('\n')}
  </head>
  <body>
    <div id="app"></div>
${scriptFiles.map((file) => `    <script defer src="${file}"></script>`).join('\n')}
  </body>
</html>
`;

await writeFile(path.join(distDir, 'index.html'), html, 'utf8');
