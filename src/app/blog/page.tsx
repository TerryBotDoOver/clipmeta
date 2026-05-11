import Link from 'next/link';
import { getBlogPosts } from '@/lib/blog';
import { FlightDeckShell } from '@/components/landing/FlightDeckShell';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | ClipMeta',
  description: 'Guides and tips for stock footage contributors. Learn how to improve your metadata, upload to platforms, and increase your sales.',
  alternates: { canonical: 'https://clipmeta.app/blog' },
  openGraph: {
    title: 'ClipMeta Blog | Stock Footage Metadata Guides',
    description: 'Guides and tips for stock footage contributors. Learn how to improve metadata, keywording, and marketplace CSV workflows.',
    url: 'https://clipmeta.app/blog',
    siteName: 'ClipMeta',
    type: 'website',
  },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogPage() {
  const posts = getBlogPosts();
  const blogSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': 'https://clipmeta.app/blog#collection',
        name: 'ClipMeta Blog',
        url: 'https://clipmeta.app/blog',
        description: metadata.description,
        isPartOf: {
          '@type': 'WebSite',
          '@id': 'https://clipmeta.app/#website',
          name: 'ClipMeta',
          url: 'https://clipmeta.app',
        },
      },
      {
        '@type': 'Blog',
        '@id': 'https://clipmeta.app/blog#blog',
        name: 'ClipMeta Blog',
        url: 'https://clipmeta.app/blog',
        description: metadata.description,
        publisher: {
          '@type': 'Organization',
          '@id': 'https://clipmeta.app/#organization',
          name: 'ClipMeta',
          url: 'https://clipmeta.app',
          logo: {
            '@type': 'ImageObject',
            url: 'https://clipmeta.app/logo-full.png',
          },
        },
      },
      {
        '@type': 'ItemList',
        '@id': 'https://clipmeta.app/blog#posts',
        itemListElement: posts.slice(0, 20).map((post, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `https://clipmeta.app/blog/${post.slug}`,
          name: post.title,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': 'https://clipmeta.app/blog#breadcrumb',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'ClipMeta',
            item: 'https://clipmeta.app',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: 'https://clipmeta.app/blog',
          },
        ],
      },
    ],
  };

  return (
    <FlightDeckShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />

      {/* Header */}
      <section className="mx-auto max-w-5xl px-6 py-16 text-center md:py-24">
        <p className="hud-chip mx-auto mb-4 inline-flex">BLOG · FIELD NOTES</p>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          Guides for <span className="gradient-text">stock footage contributors.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-white/60">
          Tips, tutorials, and deep dives on metadata, keywording, and shipping to Blackbox, Shutterstock, Adobe, and Pond5.
        </p>
      </section>

      {/* Posts */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        {posts.length === 0 ? (
          <p className="text-white/60">No posts yet. Check back soon.</p>
        ) : (
          <div className="grid gap-4">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="glass-card group block p-6"
              >
                <div className="mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                  <span>{formatDate(post.date)}</span>
                  <span className="text-white/20">·</span>
                  <span>{post.readTime} min read</span>
                </div>
                <h2 className="mb-2 text-xl font-semibold text-white transition group-hover:text-violet-200 sm:text-2xl">
                  {post.title}
                </h2>
                <p className="line-clamp-2 text-sm leading-relaxed text-white/65">
                  {post.description || post.excerpt}
                </p>
                {post.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {post.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/8 bg-white/[0.02] px-2.5 py-0.5 font-mono text-[10px] text-white/50"
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
    </FlightDeckShell>
  );
}
