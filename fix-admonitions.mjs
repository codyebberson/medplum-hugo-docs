import fs from 'node:fs';
import path from 'node:path';

const contentRoot = path.resolve('./content');
const dryRun = process.argv.includes('--dry-run');

// Map caution → warning
const typeMap = {
  note: 'note',
  tip: 'tip',
  info: 'info',
  warning: 'warning',
  danger: 'danger',
  caution: 'warning',
};

// Matches opening admonition lines:
//   ::::note
//   ::::tip Some Title
//   ::::warning[Important: Dev vs Prod]
//   :::note (3 colons)
const openPattern = /^(\s*):{3,4}(note|tip|info|warning|danger|caution)(?:\s+(.+?)|\[(.+?)\])?\s*$/;

// Matches closing admonition lines:
//   ::::
//   :::
const closePattern = /^(\s*):{3,4}\s*$/;

let totalFiles = 0;
let totalReplacements = 0;
const warnings = [];

function crawlDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      crawlDir(fullPath);
    } else if (entry.name.endsWith('.md')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const result = [];
  const stack = []; // track open admonition types for correct closing tags
  let changed = false;
  const relPath = path.relative(contentRoot, filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const openMatch = line.match(openPattern);
    if (openMatch) {
      const indent = openMatch[1];
      const rawType = openMatch[2];
      const type = typeMap[rawType];
      const title = openMatch[3] || openMatch[4] || '';

      // Warn about indented admonitions (inside list items) — shortcodes may not work
      if (indent.length > 0) {
        warnings.push(`${relPath}:${i + 1} - Indented ${rawType} admonition (${indent.length} spaces). May need manual fix.`);
      }

      const titleAttr = title ? ` title="${title}"` : '';
      result.push(`${indent}{{< ${type}${titleAttr} >}}`);
      stack.push({ type, indent });
      changed = true;
      continue;
    }

    const closeMatch = line.match(closePattern);
    if (closeMatch && stack.length > 0) {
      const { type, indent } = stack.pop();
      result.push(`${indent}{{< /${type} >}}`);
      changed = true;
      continue;
    }

    result.push(line);
  }

  if (stack.length > 0) {
    warnings.push(`${relPath} - ${stack.length} unclosed admonition(s) at end of file`);
  }

  if (changed) {
    totalFiles++;
    totalReplacements++;
    if (!dryRun) {
      fs.writeFileSync(filePath, result.join('\n'), 'utf8');
    }
    console.log(`${dryRun ? '[DRY RUN] ' : ''}Updated: ${relPath}`);
  }
}

console.log(`${dryRun ? 'DRY RUN - ' : ''}Migrating admonitions in ${contentRoot}\n`);
crawlDir(contentRoot);

console.log(`\n--- Summary ---`);
console.log(`Files updated: ${totalFiles}`);
if (warnings.length > 0) {
  console.log(`\nWarnings (${warnings.length}):`);
  for (const w of warnings) {
    console.log(`  ⚠ ${w}`);
  }
}
