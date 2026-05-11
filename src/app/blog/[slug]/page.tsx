import Link from 'next/link';
import { getBlogPost, getBlogPosts } from '@/lib/blog';
import { FlightDeckShell } from '@/components/landing/FlightDeckShell';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  const ogImage = `https://clipmeta.app/og/blog/${slug}.png`;

  return {
    title: `${post.title} | ClipMeta Blog`,
    description: post.description,
    alternates: {
      canonical: `https://clipmeta.app/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://clipmeta.app/blog/${slug}`,
      siteName: 'ClipMeta',
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [ogImage],
    },
  };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function parseFaqFromContent(content: string): Array<{ question: string; answer: string }> {
  // Look for FAQ section
  const faqMatch = content.match(/##\s+(?:Frequently Asked Questions|FAQ)([\s\S]*?)(?=\n##\s+|\n---|\s*$)/i);
  if (!faqMatch) return [];

  const faqSection = faqMatch[1];
  const faqs: Array<{ question: string; answer: string }> = [];

  // Pattern 1: Q: ... A: ... format
  const qaPattern = /Q:\s*(.+?)\s*\n+A:\s*([\s\S]+?)(?=\nQ:|\n\*\*Q:|\n###|\s*$)/gi;
  let match;
  while ((match = qaPattern.exec(faqSection)) !== null) {
    faqs.push({ question: match[1].trim(), answer: match[2].trim() });
  }

  if (faqs.length > 0) return faqs;

  // Pattern 2: **Q:** ... **A:** ... format
  const boldQaPattern = /\*\*Q:\*\*\s*(.+?)\s*\n+\*\*A:\*\*\s*([\s\S]+?)(?=\n\*\*Q:|\n###|\s*$)/gi;
  while ((match = boldQaPattern.exec(faqSection)) !== null) {
    faqs.push({ question: match[1].trim(), answer: match[2].trim() });
  }

  if (faqs.length > 0) return faqs;

  // Pattern 3: ### Question headers followed by answer text
  const h3Pattern = /###\s+(.+?)\s*\n+([\s\S]+?)(?=\n###|\s*$)/g;
  while ((match = h3Pattern.exec(faqSection)) !== null) {
    faqs.push({ question: match[1].trim(), answer: match[2].trim() });
  }

  if (faqs.length > 0) return faqs;

  // Pattern 4: **Bold question?**\nAnswer text (used in existing posts)
  const boldQuestionPattern = /\*\*(.+?\?)\*\*\s*\n+([\s\S]+?)(?=\n\*\*[^*]+\?\*\*|\n---|\n##|\s*$)/g;
  while ((match = boldQuestionPattern.exec(faqSection)) !== null) {
    faqs.push({ question: match[1].trim(), answer: match[2].trim() });
  }

  return faqs;
}

function cleanTextForSchema(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const postUrl = `https://clipmeta.app/blog/${slug}`;
  const ogImage = `https://clipmeta.app/og/blog/${slug}.png`;
  const wordCount = cleanTextForSchema(post.content || '').split(/\s+/).filter(Boolean).length;
  const schemaOrg = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${postUrl}#article`,
        headline: post.title,
        description: post.description || post.excerpt,
        image: [ogImage],
        datePublished: post.date,
        dateModified: post.date,
        author: {
          '@type': 'Organization',
          name: post.author,
        },
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
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': postUrl,
        },
        url: postUrl,
        keywords: post.tags,
        articleSection: post.tags[0] || 'Stock footage metadata',
        wordCount,
        timeRequired: `PT${post.readTime}M`,
        isPartOf: {
          '@type': 'Blog',
          '@id': 'https://clipmeta.app/blog#blog',
          name: 'ClipMeta Blog',
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${postUrl}#breadcrumb`,
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
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: postUrl,
          },
        ],
      },
    ],
  };

  // Parse FAQ from raw markdown content for structured data
  const faqs = parseFaqFromContent(post.content || '');
  const faqSchema = faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: cleanTextForSchema(faq.question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: cleanTextForSchema(faq.answer),
      },
    })),
  } : null;

  return (
    <FlightDeckShell>
      <article className="mx-auto max-w-3xl px-6 py-16">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-white/40">
          <Link href="/blog" className="flex items-center gap-1 transition hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Blog
          </Link>
          <span className="text-white/20">/</span>
          <span className="truncate text-white/60">{post.title}</span>
        </div>

        {/* Header */}
        <header className="mb-12">
          <h1 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-white/40">
            <span>{post.author}</span>
            <span className="text-white/20">·</span>
            <span>{formatDate(post.date)}</span>
            <span className="text-white/20">·</span>
            <span>{post.readTime} min read</span>
          </div>
        </header>

        {/* Content */}
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
        <style>{`
          .blog-content { color: rgba(255, 255, 255, 0.72); font-size: 1rem; line-height: 1.8; }
          .blog-content h1, .blog-content h2, .blog-content h3, .blog-content h4 { color: #fafafa; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; line-height: 1.3; }
          .blog-content h1 { font-size: 1.875rem; }
          .blog-content h2 { font-size: 1.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 0.5rem; }
          .blog-content h3 { font-size: 1.25rem; }
          .blog-content p { margin-bottom: 1.25rem; }
          .blog-content a { color: #c4b5fd; text-decoration: none; border-bottom: 1px solid rgba(196, 181, 253, 0.3); }
          .blog-content a:hover { color: #ddd6fe; border-bottom-color: rgba(196, 181, 253, 0.6); }
          .blog-content strong { color: #fafafa; font-weight: 600; }
          .blog-content ul, .blog-content ol { margin-left: 1.5rem; margin-bottom: 1.25rem; }
          .blog-content li { margin-bottom: 0.4rem; }
          .blog-content ul li { list-style-type: disc; }
          .blog-content ol li { list-style-type: decimal; }
          .blog-content blockquote { border-left: 3px solid #8b5cf6; padding-left: 1rem; color: rgba(255, 255, 255, 0.55); margin: 1.5rem 0; font-style: italic; }
          .blog-content code { color: #c4b5fd; background: rgba(139, 92, 246, 0.12); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.875rem; }
          .blog-content pre { background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 1rem; overflow-x: auto; margin-bottom: 1.25rem; }
          .blog-content pre code { background: none; padding: 0; color: #e9d5ff; }
          .blog-content hr { border: none; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 2rem 0; }
          .blog-content table { width: 100%; border-collapse: collapse; margin-bottom: 1.25rem; }
          .blog-content th { color: #fafafa; font-weight: 600; text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid rgba(255, 255, 255, 0.12); font-size: 0.875rem; }
          .blog-content td { padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 0.875rem; }
        `}</style>

        {/* CTA Banner */}
        <div className="glass-card mt-16 p-8 text-center">
          <p className="hud-chip mx-auto mb-4 inline-flex">READY TO SHIP</p>
          <h2 className="mb-3 text-2xl font-bold text-white">
            Try it <span className="gradient-text">free.</span>
          </h2>
          <p className="mb-6 text-white/60">
            3 clips per day, no credit card required.
          </p>
          <Link
            href="/sign-up"
            className="group relative inline-block overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/50"
          >
            <span className="relative z-10">Get Started Free</span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </Link>
        </div>

        {/* Back to blog */}
        <div className="mt-8 text-center">
          <Link href="/blog" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-white/40 transition hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to all posts
          </Link>
        </div>
      </article>

      {/* Schema.org — Article */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
      {/* Schema.org — FAQPage (if FAQ section found) */}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
    </FlightDeckShell>
  );
}
