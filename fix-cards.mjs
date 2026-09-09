import fs from 'node:fs';
import path from 'node:path';

const BLOG_DIR = path.resolve('./src/content/blog');
const SITE_URL = 'https://devstackhub.tech';

// Exact 1 to 9 mapping matching your numbered screenshot
const ARTICLES = [
  { order: 1, slug: 'azure-app-service-deployment' },
  { order: 2, slug: 'docker-containers-production-guide' },
  { order: 3, slug: 'github-actions-ci-cd-production-workflows' },
  { order: 4, slug: 'terraform-on-azure-iac-guide' },
  { order: 5, slug: 'kubernetes-vs-docker-swarm-aks-guide' },
  { order: 6, slug: 'terraform-azure-github-actions-guide' },
  { order: 7, slug: 'kubernetes-monitoring-with-prometheus-and-grafana' },
  { order: 8, slug: 'terraform-aws-production-infrastructure' },
  { order: 9, slug: 'aws-ecs-github-actions-cicd-guide' },
];

async function updateArticles() {
  console.log('Fetching live post metadata from WordPress...');
  const res = await fetch(`${SITE_URL}/wp-json/wp/v2/posts?per_page=50&_embed`);
  const wpPosts = await res.json();

  const wpMap = new Map();
  for (const post of wpPosts) {
    const featured = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';
    wpMap.set(post.slug, {
      coverImage: featured,
      title: post.title?.rendered || '',
    });
  }

  for (const item of ARTICLES) {
    const filePath = path.join(BLOG_DIR, `${item.slug}.md`);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping missing file: ${item.slug}.md`);
      continue;
    }

    let raw = fs.readFileSync(filePath, 'utf-8');
    const wpData = wpMap.get(item.slug) || {};
    const coverUrl = wpData.coverImage || '';

    // Remove existing order or coverImage lines if present
    raw = raw.replace(/\norder:\s*.*\n/, '\n');
    raw = raw.replace(/\ncoverImage:\s*.*\n/, '\n');

    // Insert order and coverImage right after the opening ---
    const injection = `\norder: ${item.order}\ncoverImage: ${JSON.stringify(coverUrl)}`;
    const updated = raw.replace(/^---\r?\n/, `---${injection}\n`);

    fs.writeFileSync(filePath, updated, 'utf-8');
    console.log(`Updated Article ${item.order}: ${item.slug} (Image: ${coverUrl ? 'Found' : 'None'})`);
  }

  console.log('\nAll 9 markdown files successfully injected with order and coverImage!');
}

updateArticles();