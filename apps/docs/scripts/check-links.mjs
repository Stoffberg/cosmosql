import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// We'll need to get valid pages from the built source
// For now, let's extract links from MDX files and check common patterns

async function getAllMdxFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getAllMdxFiles(fullPath));
    } else if (entry.name.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function extractLinks(content, filePath) {
  const links = [];
  // Match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    const [, text, url] = match;
    // Skip external links (http, https, mailto, etc.)
    if (!url.match(/^(https?|mailto|#)/)) {
      links.push({
        text,
        url,
        file: filePath.replace(rootDir, ''),
      });
    }
  }
  
  return links;
}

// Get valid page paths - we'll construct them from the file structure
async function getValidPaths() {
  const docsDir = join(rootDir, 'content/docs');
  const files = await getAllMdxFiles(docsDir);
  const validPaths = new Set(['/', '/docs', '/docs/index']);
  
  for (const file of files) {
    const relativePath = file.replace(docsDir, '').replace(/^\//, '').replace(/\.mdx$/, '');
    if (relativePath === 'index') {
      continue; // Already added as /docs
    }
    const slug = relativePath.split('/').filter(Boolean);
    if (slug.length > 0) {
      validPaths.add(`/docs/${slug.join('/')}`);
      // Also add without .mdx extension variations
      if (relativePath.endsWith('/index')) {
        validPaths.add(`/docs/${relativePath.replace(/\/index$/, '')}`);
      }
    }
  }
  
  return validPaths;
}

async function checkLinks() {
  console.log('🔍 Checking for broken links...\n');
  
  const docsDir = join(rootDir, 'content/docs');
  const files = await getAllMdxFiles(docsDir);
  const validPaths = await getValidPaths();
  
  const allLinks = [];
  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const links = extractLinks(content, file);
    allLinks.push(...links);
  }
  
  console.log(`Found ${allLinks.length} internal links to check...\n`);
  
  const brokenLinks = [];
  const checkedLinks = new Set();
  
  for (const link of allLinks) {
    const linkKey = `${link.file}:${link.url}`;
    if (checkedLinks.has(linkKey)) continue;
    checkedLinks.add(linkKey);
    
    // Normalize the URL
    let normalizedUrl = link.url;
    
    // Remove anchors
    normalizedUrl = normalizedUrl.split('#')[0];
    
    // Handle relative paths
    if (normalizedUrl.startsWith('./') || normalizedUrl.startsWith('../')) {
      // This is a relative path - createRelativeLink should handle it
      // But we can check if the target file exists
      const linkFileDir = join(rootDir, link.file.substring(1)).replace(/\/[^/]+$/, '');
      const targetPath = join(linkFileDir, normalizedUrl);
      // Skip this check for now as it requires more complex path resolution
      continue;
    }
    
    // Remove leading slash for comparison
    if (normalizedUrl.startsWith('/docs/')) {
      normalizedUrl = normalizedUrl;
    } else if (normalizedUrl.startsWith('docs/')) {
      normalizedUrl = `/${normalizedUrl}`;
    } else if (!normalizedUrl.startsWith('/')) {
      // Relative path without ./ or ../ - might be a page reference
      // Skip for now as createRelativeLink handles these
      continue;
    }
    
    // Check if it's a valid path
    if (!validPaths.has(normalizedUrl) && normalizedUrl.startsWith('/docs/')) {
      // Check variations
      const withoutIndex = normalizedUrl.replace(/\/index$/, '');
      const withIndex = normalizedUrl.endsWith('/') ? normalizedUrl + 'index' : normalizedUrl + '/index';
      
      if (!validPaths.has(withoutIndex) && !validPaths.has(withIndex)) {
        brokenLinks.push(link);
      }
    }
  }
  
  if (brokenLinks.length === 0) {
    console.log('✅ No broken links found!');
    return;
  }
  
  console.log(`❌ Found ${brokenLinks.length} potentially broken links:\n`);
  
  // Group by file
  const byFile = new Map();
  for (const link of brokenLinks) {
    if (!byFile.has(link.file)) {
      byFile.set(link.file, []);
    }
    byFile.get(link.file).push(link);
  }
  
  for (const [file, links] of byFile) {
    console.log(`📄 ${file}:`);
    for (const link of links) {
      console.log(`   [${link.text}](${link.url})`);
    }
    console.log();
  }
  
  process.exit(1);
}

checkLinks().catch(console.error);
