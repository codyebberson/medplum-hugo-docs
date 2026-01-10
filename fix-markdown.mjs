import fs from "node:fs";
import path, { resolve } from "node:path";

// const sourceRoot = 'c:/Users/Cody/dev/medplum/packages/docs/docs';
// const destRoot = 'c:/Users/Cody/dev/medplum-hugo-docs/content/docs';

const sourceRoot = resolve("../medplum/packages/docs/docs");
const destRoot = resolve("./content/docs");
const forceWrite = true;

async function main() {
  console.log("Source root: " + sourceRoot);
  console.log("Dest root: " + destRoot);
  await crawlDir(sourceRoot);
}

async function crawlDir(sourceDir) {
  if (
    sourceDir.includes("docs\\sdk") ||
    sourceDir.includes("docs/sdk") ||
    sourceDir.includes("docs\\api\\fhir") ||
    sourceDir.includes("docs/api/fhir")
  ) {
    return;
  }

  const files = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const file of files) {
    const sourceFilePath = path.join(sourceDir, file.name);
    if (file.isDirectory()) {
      await crawlDir(sourceFilePath);
    } else {
      await fixFile(sourceFilePath);
    }
  }
}

async function fixFile(sourceFilePath) {
  if (!sourceFilePath.endsWith(".md") && !sourceFilePath.endsWith(".mdx")) {
    return;
  }

  let content = fs.readFileSync(sourceFilePath, "utf8");
  const frontMatterStr = getFrontMatter(sourceFilePath, content);

  const frontMatter = frontMatterStr
    ? frontMatterStr.split("\n")
    : ["---", "---"];

  let hasChanges = false;

  // Make sure there is an "id"
  if (!frontMatter.some((line) => line.startsWith("id:"))) {
    const id = path.basename(sourceFilePath, path.extname(sourceFilePath));
    frontMatter.splice(1, 0, `id: ${id}`);
    hasChanges = true;
  }

  // Make sure there is a "title"
  if (!frontMatter.some((line) => line.startsWith("title:"))) {
    const title = getTitle(sourceFilePath, content);
    frontMatter.splice(2, 0, `title: ${title}`);
    hasChanges = true;
  }

  // Change "sidebar_position" to "weight"
  for (let i = 0; i < frontMatter.length; i++) {
    if (frontMatter[i].startsWith("sidebar_position:")) {
      frontMatter[i] = frontMatter[i].replace("sidebar_position:", "weight:");
      hasChanges = true;
    }
  }

  // Remove backticks from front matter titles
  for (let i = 0; i < frontMatter.length; i++) {
    if (frontMatter[i].startsWith("title:") && frontMatter[i].includes("`")) {
      frontMatter[i] = frontMatter[i].replace(/`/g, "");
      hasChanges = true;
    }
  }

  // Remove MDX style imports
  // I.e., `^import (\w)+ from `
  if (content.match(/^import (\w)+ from .+$/gm)) {
    content = content.replace(/^import (\w)+ from .+$/gm, "");
    hasChanges = true;
  }

  // Remove all imports from "@site/"
  // import { Section } from '@site/src/components/landing/Section.tsx';
  // import { Feature, FeatureGrid } from '@site/src/components/landing/FeatureGrid.tsx';
  if (content.match(/^import .+ from ['"]@site\/.+['"];?$/gm)) {
    content = content.replace(/^import .+ from ['"]@site\/.+['"];?$/gm, "");
    hasChanges = true;
  }

  // Replace all "```cli" with "```bash"
  if (content.includes("```cli")) {
    content = content.replaceAll(/```cli/g, "```bash");
    hasChanges = true;
  }

  // Replace all "```curl" with "```bash"
  if (content.includes("```curl")) {
    content = content.replaceAll(/```curl/g, "```bash");
    hasChanges = true;
  }

  // Replace all "```fsh" with "```txt"
  if (content.includes("```fsh")) {
    content = content.replaceAll(/```fsh/g, "```txt");
    hasChanges = true;
  }

  // Replace all "```PLpgSQL" with "```sql"
  if (content.includes("```PLpgSQL")) {
    content = content.replaceAll(/```PLpgSQL/g, "```sql");
    hasChanges = true;
  }

  if (hasChanges || forceWrite) {
    const newFrontMatterStr = frontMatter.join("\n");
    const contentWithoutFrontMatter = frontMatterStr
      ? content.replace(frontMatterStr, "").trimStart()
      : content;

    const newContent = newFrontMatterStr + "\n\n" + contentWithoutFrontMatter;

    const destPath = sourceFilePath
      .replace(sourceRoot, destRoot)
      .replace(".mdx", ".md")
      .replace("index.md", "_index.md")
      .replace("home.md", "_index.md");

    // Ensure the destination directory exists
    const destDir = path.dirname(destPath);
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(destPath, newContent, "utf8");
    console.log(`Migrated file: ${sourceFilePath} to ${destPath}`);
  }
}

function getFrontMatter(sourceFilePath, content) {
  if (!content.trim().startsWith("---")) {
    return undefined;
  }

  const frontMatterStart = content.indexOf("---\n");
  if (frontMatterStart < 0) {
    return undefined;
  }

  const frontMatterEnd = content.indexOf("---\n", frontMatterStart + 4);
  if (frontMatterEnd < 0) {
    console.warn("No closing front matter found: " + sourceFilePath);
    return undefined;
  }

  const frontMatterContent = content
    .slice(frontMatterStart, frontMatterEnd + 4)
    .trim();
  return frontMatterContent;
}

function getTitle(sourceFilePath, content) {
  // Find the first line starting with a '#' header:
  const lines = content.split("\n");
  for (const line of lines) {
    if (line.startsWith("# ")) {
      return line.slice(2).trim();
    }
  }
  console.warn("No title found in file: " + sourceFilePath);
  return "Untitled";
}

main().catch(console.error);
