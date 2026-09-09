import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),
    description: z.string().default('Production architecture and engineering playbook.'),
    pubDate: z.coerce.date(),
    order: z.number().default(99),
    coverImage: z.string().optional(),
    author: z.string().default('Farraz Ahmed'),
    category: z.string().default('Cloud & DevOps'),
    badge: z.string().default('PRODUCTION PLAYBOOK'),
    readTime: z.string().default('7 MIN READ'),
    focusKeyword: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog };