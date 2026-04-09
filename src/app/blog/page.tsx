import Link from 'next/link';
import { getBlogPosts } from '@/lib/blog';
import { BlogNav } from '@/components/BlogNav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | ClipMeta',
  description: 'Guides and tips for stock footage contributors. Learn how to improve your metadata, upload to platforms, and increase your sales.',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogPage() {
  const posts = getBlogPosts();

  return (
    <main className="min-h-screen bg-background">
      {/* Nav */}
      <BlogNav />

      {/* Header */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">ClipMeta Blog</h1>
        <p className="text-lg text-muted-foreground">
          Guides, tutorials, and tips for stock footage contributors.
        </p>
      </section>

      {/* Posts */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        {posts.length === 0 ? (
          <p className="text-muted-foreground">No posts yet. Check back soon.</p>
        ) : (
          <div className="grid gap-6">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-muted-foreground">{formatDate(post.date)}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-sm text-muted-foreground">{post.readTime} min read</span>
                </div>
                <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition mb-2">
                  {post.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                  {post.description || post.excerpt}
                </p>
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
