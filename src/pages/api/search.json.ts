import { getCollection } from 'astro:content';

export async function GET() {
  const posts = await getCollection('blog');
  const searchList = posts.map((post) => ({
    id: post.id,
    title: post.data.title,
    description: post.data.description,
    category: post.data.category,
    badge: post.data.badge,
    url: `/blog/${post.id}/`,
  }));

  return new Response(JSON.stringify(searchList), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}