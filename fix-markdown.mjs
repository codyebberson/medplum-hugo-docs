import fs from 'node:fs';
import path, { resolve } from 'node:path';

const forceWrite = true;

const directories = [
  {
    sourceRoot: resolve('../medplum/packages/docs/blog'),
    destRoot: resolve('./content/blog'),
  },
  {
    sourceRoot: resolve('../medplum/packages/docs/docs'),
    destRoot: resolve('./content/docs'),
  },
  {
    sourceRoot: resolve('../medplum/packages/docs/src/pages'),
    destRoot: resolve('./content'),
  },
];

async function main() {
  for (const { sourceRoot, destRoot } of directories) {
    console.log('Source root: ' + sourceRoot);
    console.log('Dest root: ' + destRoot);
    await crawlDir(sourceRoot, destRoot, sourceRoot);
  }
}

async function crawlDir(sourceRoot, destRoot, sourceDir) {
  if (sourceDir.includes('docs\\sdk') || sourceDir.includes('docs/sdk') || sourceDir.includes('docs\\api\\fhir') || sourceDir.includes('docs/api/fhir')) {
    return;
  }

  const files = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const file of files) {
    const sourceFilePath = path.join(sourceDir, file.name);
    if (file.isDirectory()) {
      await crawlDir(sourceRoot, destRoot, sourceFilePath);
    } else {
      await fixFile(sourceRoot, destRoot, sourceFilePath);
    }
  }
}

async function fixFile(sourceRoot, destRoot, sourceFilePath) {
  if (!sourceFilePath.endsWith('.md') && !sourceFilePath.endsWith('.mdx')) {
    return;
  }

  let content = fs.readFileSync(sourceFilePath, 'utf8');
  const frontMatterStr = getFrontMatter(sourceFilePath, content);

  const frontMatter = frontMatterStr ? frontMatterStr.split('\n') : ['---', '---'];

  let hasChanges = false;

  // Make sure there is an "id"
  if (!frontMatter.some((line) => line.startsWith('id:'))) {
    const id = path.basename(sourceFilePath, path.extname(sourceFilePath));
    frontMatter.splice(1, 0, `id: ${id}`);
    hasChanges = true;
  }

  // Make sure there is a "title"
  if (!frontMatter.some((line) => line.startsWith('title:'))) {
    const title = getTitle(sourceFilePath, content);
    const safeTitle = title.includes(':') ? `"${title}"` : title;
    frontMatter.splice(2, 0, `title: ${safeTitle}`);
    hasChanges = true;
  }

  // Change "sidebar_position" to "weight"
  for (let i = 0; i < frontMatter.length; i++) {
    if (frontMatter[i].startsWith('sidebar_position:')) {
      frontMatter[i] = frontMatter[i].replace('sidebar_position:', 'weight:');
      hasChanges = true;
    }
  }

  // Remove backticks from front matter titles
  for (let i = 0; i < frontMatter.length; i++) {
    if (frontMatter[i].startsWith('title:') && frontMatter[i].includes('`')) {
      frontMatter[i] = frontMatter[i].replace(/`/g, '');
      hasChanges = true;
    }
  }

  // Remove MDX style imports
  // I.e., `^import (\w)+ from `
  if (content.match(/^import (\w)+ from .+$/gm)) {
    content = content.replace(/^import (\w)+ from .+$/gm, '');
    hasChanges = true;
  }

  // Remove the first H1 header (title is now rendered by the layout template from front matter)
  if (content.match(/^# .+$/m)) {
    content = content.replace(/^# .+\n?/m, '');
    hasChanges = true;
  }

  // Remove all imports from "@site/"
  // import { Section } from '@site/src/components/landing/Section.tsx';
  // import { Feature, FeatureGrid } from '@site/src/components/landing/FeatureGrid.tsx';
  if (content.match(/^import .+ from ['"]@site\/.+['"];?$/gm)) {
    content = content.replace(/^import .+ from ['"]@site\/.+['"];?$/gm, '');
    hasChanges = true;
  }

  // Replace all "```cli" with "```bash"
  if (content.includes('```cli')) {
    content = content.replaceAll(/```cli/g, '```bash');
    hasChanges = true;
  }

  // Replace all "```curl" with "```bash"
  if (content.includes('```curl')) {
    content = content.replaceAll(/```curl/g, '```bash');
    hasChanges = true;
  }

  // Replace all "```fsh" with "```txt"
  if (content.includes('```fsh')) {
    content = content.replaceAll(/```fsh/g, '```txt');
    hasChanges = true;
  }

  // Replace all "```PLpgSQL" with "```sql"
  if (content.includes('```PLpgSQL')) {
    content = content.replaceAll(/```PLpgSQL/g, '```sql');
    hasChanges = true;
  }

  // Replace Docusaurus "<!-- truncate -->" with Hugo "<!--more-->"
  if (content.includes('<!-- truncate -->')) {
    content = content.replaceAll('<!-- truncate -->', '<!--more-->');
    hasChanges = true;
  }

  // Remove JSX comments {/* ... */} (can span multiple lines)
  if (content.includes('{/*')) {
    content = content.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    hasChanges = true;
  }

  // Replace React `className` with `class`
  // For example: `<div className="responsive-iframe-wrapper">`
  if (content.match(/className=/g)) {
    content = content.replace(/className=/g, 'class=');
    hasChanges = true;
  }

  // Convert Docusaurus admonitions to Hugo shortcodes
  const admonitionResult = fixAdmonitions(content);
  if (admonitionResult.changed) {
    content = admonitionResult.content;
    hasChanges = true;
  }

  // Convert Docusaurus Tabs/TabItem to Hugo shortcodes
  const tabsResult = fixTabs(content);
  if (tabsResult.changed) {
    content = tabsResult.content;
    hasChanges = true;
  }

  // Convert landing page React components to Hugo shortcodes
  const landingResult = fixLandingComponents(content);
  if (landingResult.changed) {
    content = landingResult.content;
    hasChanges = true;
  }

  if (hasChanges || forceWrite) {
    const newFrontMatterStr = frontMatter.join('\n');
    const contentWithoutFrontMatter = frontMatterStr ? content.replace(frontMatterStr, '').trimStart() : content;

    const newContent = newFrontMatterStr + '\n\n' + contentWithoutFrontMatter;

    const destPath = sourceFilePath.replace(sourceRoot, destRoot).replace('.mdx', '.md').replace('index.md', '_index.md').replace('home.md', '_index.md');

    // Ensure the destination directory exists
    const destDir = path.dirname(destPath);
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(destPath, newContent, 'utf8');
    console.log(`Migrated file: ${sourceFilePath} to ${destPath}`);
  }
}

// Map Docusaurus admonition types to Hugo shortcode types
const admonitionTypeMap = {
  note: 'note',
  tip: 'tip',
  info: 'info',
  warning: 'warning',
  danger: 'danger',
  caution: 'warning',
};

// Matches opening admonition lines:
//   ::::note            ::::tip Some Title
//   ::::warning[Title]  ::: caution (with space)
const admonitionOpenPattern = /^(\s*):{3,4}\s?(note|tip|info|warning|danger|caution)(?:\s+(.+?)|\[(.+?)\])?\s*$/;

// Matches closing admonition lines: :::: or :::
const admonitionClosePattern = /^(\s*):{3,4}\s*$/;

function fixAdmonitions(content) {
  const lines = content.split('\n');
  const result = [];
  const stack = [];
  let changed = false;

  for (const line of lines) {
    const openMatch = line.match(admonitionOpenPattern);
    if (openMatch) {
      const indent = openMatch[1];
      const rawType = openMatch[2];
      const type = admonitionTypeMap[rawType];
      const title = openMatch[3] || openMatch[4] || '';
      const titleAttr = title ? ` title="${title}"` : '';
      result.push(`${indent}{{< ${type}${titleAttr} >}}`);
      stack.push({ type, indent });
      changed = true;
      continue;
    }

    const closeMatch = line.match(admonitionClosePattern);
    if (closeMatch && stack.length > 0) {
      const { type, indent } = stack.pop();
      result.push(`${indent}{{< /${type} >}}`);
      changed = true;
      continue;
    }

    result.push(line);
  }

  return { content: result.join('\n'), changed };
}

// Convert <Tabs>/<TabItem> to {{< tabs >}}/{{< tab >}} shortcodes
function fixTabs(content) {
  let changed = false;

  // Opening <Tabs ...> or <BrowserOnlyTabs ...>
  content = content.replace(/^(\s*)<(?:Tabs|BrowserOnlyTabs)(\s[^>]*)?\s*>/gm, (match, indent, attrs) => {
    changed = true;
    const groupMatch = attrs?.match(/groupId="([^"]+)"/);
    const groupAttr = groupMatch ? ` groupId="${groupMatch[1]}"` : '';
    return `${indent}{{< tabs${groupAttr} >}}`;
  });

  // Closing </Tabs> or </BrowserOnlyTabs>
  content = content.replace(/^(\s*)<\/(?:Tabs|BrowserOnlyTabs)>/gm, (match, indent) => {
    changed = true;
    return `${indent}{{< /tabs >}}`;
  });

  // Opening <TabItem value="..." label="...">
  content = content.replace(/^(\s*)<TabItem\s+([^>]+)>/gm, (match, indent, attrs) => {
    changed = true;
    const valueMatch = attrs.match(/value="([^"]+)"/);
    const labelMatch = attrs.match(/label="([^"]+)"/);
    const value = valueMatch ? valueMatch[1] : '';
    const label = labelMatch ? labelMatch[1] : value;
    return `${indent}{{< tab value="${value}" label="${label}" >}}`;
  });

  // Closing </TabItem>
  content = content.replace(/^(\s*)<\/TabItem>/gm, (match, indent) => {
    changed = true;
    return `${indent}{{< /tab >}}`;
  });

  return { content, changed };
}

// Convert landing page React components (Section, FeatureGrid, Feature) to Hugo shortcodes
function fixLandingComponents(content) {
  let changed = false;

  const componentMap = {
    Section: 'section',
    FeatureGrid: 'feature-grid',
    Feature: 'feature',
  };

  for (const [jsx, shortcode] of Object.entries(componentMap)) {
    // Opening tags: <Component ...>
    const openRegex = new RegExp(`^(\\s*)<${jsx}\\b(\\s[^>]*)?>`, 'gm');
    content = content.replace(openRegex, (match, indent, attrs) => {
      changed = true;
      // Convert JSX {value} attributes to "value"
      const hugoAttrs = attrs ? attrs.replace(/\{([^}]+)\}/g, '"$1"') : '';
      return `{{< ${shortcode}${hugoAttrs} >}}`;
    });

    // Closing tags: </Component>
    const closeRegex = new RegExp(`^(\\s*)</${jsx}>`, 'gm');
    content = content.replace(closeRegex, () => {
      changed = true;
      return `{{< /${shortcode} >}}`;
    });
  }

  // Trim leading whitespace from content lines inside {{< section >}} blocks
  if (changed) {
    const lines = content.split('\n');
    let inSection = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '{{< section >}}') {
        inSection = true;
        continue;
      }
      if (lines[i] === '{{< /section >}}') {
        inSection = false;
        continue;
      }
      if (inSection) {
        lines[i] = lines[i].trimStart();
      }
    }
    content = lines.join('\n');
  }

  return { content, changed };
}

function getFrontMatter(sourceFilePath, content) {
  if (!content.trim().startsWith('---')) {
    return undefined;
  }

  const frontMatterStart = content.indexOf('---\n');
  if (frontMatterStart < 0) {
    return undefined;
  }

  const frontMatterEnd = content.indexOf('---\n', frontMatterStart + 4);
  if (frontMatterEnd < 0) {
    console.warn('No closing front matter found: ' + sourceFilePath);
    return undefined;
  }

  const frontMatterContent = content.slice(frontMatterStart, frontMatterEnd + 4).trim();
  return frontMatterContent;
}

function getTitle(sourceFilePath, content) {
  // Find the first line starting with a '#' header:
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.slice(2).trim();
    }
  }
  console.warn('No title found in file: ' + sourceFilePath);
  return 'Untitled';
}

main().catch(console.error);
