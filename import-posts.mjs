import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = 'https://devstackhub.tech';
const OUTPUT_DIR = path.resolve('./src/content/blog');

// Exact 1-to-9 numbering order from your list
const ORDERED_SLUGS = [
  'azure-app-service-deployment',
  'docker-containers-production-guide',
  'github-actions-ci-cd-production-workflows',
  'terraform-on-azure-iac-guide',
  'kubernetes-vs-docker-swarm-aks-guide',
  'terraform-azure-github-actions-guide',
  'kubernetes-monitoring-with-prometheus-and-grafana',
  'terraform-aws-production-infrastructure',
  'aws-ecs-github-actions-cicd-guide'
];

async function importPosts() {
  console.log(' Connecting to WordPress REST API at:', SITE_URL);
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    const response = await fetch(`${SITE_URL}/wp-json/wp/v2/posts?per_page=50&_embed`);
    if (!response.ok) {
      throw new Error(`Failed to fetch posts: HTTP ${response.status} ${response.statusText}`);
    }

    const posts = await response.json();
    console.log(` Found ${posts.length} articles! Processing metadata and cover images...`);

    for (const post of posts) {
      const slug = post.slug;
      const orderIndex = ORDERED_SLUGS.indexOf(slug);
      const articleOrder = orderIndex !== -1 ? orderIndex + 1 : 99;

      const title = (post.title?.rendered || 'Untitled')
        .replace(/&#8211;/g, '–')
        .replace(/&#8212;/g, '—')
        .replace(/&#038;/g, '&')
        .replace(/&amp;/g, '&');
      
      const seoTitle = (post.rank_math_title || post.yoast_head_json?.title || title)
        .replace(/&amp;/g, '&');

      const seoDesc = (post.rank_math_description || 
                      post.yoast_head_json?.description || 
                      post.excerpt?.rendered?.replace(/<[^>]+>/g, '').trim().slice(0, 160) || 
                      'Production architecture and engineering playbook.')
                      .replace(/&amp;/g, '&')
                      .replace(/\[&hellip;\]/g, '...');
      
      const pubDate = post.date ? post.date.split('T')[0] : '2026-08-01';

      let category = post._embedded?.['wp:term']?.[0]?.[0]?.name || 'Cloud & DevOps';
      category = category.replace(/&amp;/g, '&');

      // Extract Cover Image from WordPress _embedded media
      const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
      const coverImage = featuredMedia?.source_url || '';

      let content = post.content?.rendered || '';

      const frontmatter = `---
title: ${JSON.stringify(title)}
seoTitle: ${JSON.stringify(seoTitle)}
description: ${JSON.stringify(seoDesc)}
pubDate: ${pubDate}
order: ${articleOrder}
category: ${JSON.stringify(category)}
badge: "PRODUCTION PLAYBOOK"
readTime: "7 MIN READ"
author: "Farraz Ahmed"
coverImage: ${JSON.stringify(coverImage)}
---

${content}
`;

      const filePath = path.join(OUTPUT_DIR, `${slug}.md`);
      fs.writeFileSync(filePath, frontmatter, 'utf-8');
      console.log(` Saved [Article ${articleOrder}]: ${slug}.md`);
    }

    console.log('\n All 9 articles synchronized with cover images and numbering!');
  } catch (err) {
    console.error(' Migration Error:', err.message);
  }
}

importPosts();