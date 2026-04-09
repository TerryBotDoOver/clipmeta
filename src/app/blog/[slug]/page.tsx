import Link from 'next/link';
import { getBlogPost, getBlogPosts } from '@/lib/blog';
import { BlogNav } from '@/components/BlogNav';
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

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      '@type': 'Organization',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ClipMeta',
      url: 'https://clipmeta.app',
    },
    url: `https://clipmeta.app/blog/${slug}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://clipmeta.app/blog/${slug}`,
    },
  };

  // Parse FAQ from raw markdown content for structured data
  const faqs = parseFaqFromContent(post.content || '');
  const faqSchema = faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  } : null;

  return (
    <main className="min-h-screen bg-background">
      {/* Nav */}
      <BlogNav />

      <article className="mx-auto max-w-3xl px-6 py-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8">
          <Link href="/blog" className="flex items-center gap-1 hover:text-foreground transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Blog
          </Link>
          <span>/</span>
          <span className="text-foreground truncate">{post.title}</span>
        </div>

        {/* Header */}
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl leading-tight mb-6">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>{post.author}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{formatDate(post.date)}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{post.readTime} min read</span>
          </div>
        </header>

        {/* Content */}
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
        <style>{`
          .blog-content { color: var(--muted-foreground, #a1a1aa); font-size: 1rem; line-height: 1.8; }
          .blog-content h1, .blog-content h2, .blog-content h3, .blog-content h4 { color: #fafafa; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; line-height: 1.3; }
          .blog-content h1 { font-size: 1.875rem; }
          .blog-content h2 { font-size: 1.5rem; border-bottom: 1px solid #27272a; padding-bottom: 0.5rem; }
          .blog-content h3 { font-size: 1.25rem; }
          .blog-content p { margin-bottom: 1.25rem; }
          .blog-content a { color: #8b5cf6; text-decoration: none; }
          .blog-content a:hover { text-decoration: underline; }
          .blog-content strong { color: #fafafa; font-weight: 600; }
          .blog-content ul, .blog-content ol { margin-left: 1.5rem; margin-bottom: 1.25rem; }
          .blog-content li { margin-bottom: 0.4rem; }
          .blog-content ul li { list-style-type: disc; }
          .blog-content ol li { list-style-type: decimal; }
          .blog-content blockquote { border-left: 3px solid #8b5cf6; padding-left: 1rem; color: #71717a; margin: 1.5rem 0; }
          .blog-content code { color: #8b5cf6; background: #27272a; padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 0.875rem; }
          .blog-content pre { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 1rem; overflow-x: auto; margin-bottom: 1.25rem; }
          .blog-content pre code { background: none; padding: 0; }
          .blog-content hr { border: none; border-top: 1px solid #27272a; margin: 2rem 0; }
          .blog-content table { width: 100%; border-collapse: collapse; margin-bottom: 1.25rem; }
          .blog-content th { color: #fafafa; font-weight: 600; text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid #27272a; font-size: 0.875rem; }
          .blog-content td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #27272a; font-size: 0.875rem; }
        `}</style>

        {/* CTA Banner */}
        <div className="mt-16 rounded-xl border border-primary/30 bg-card p-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">Ready to try it?</h2>
          <p className="text-muted-foreground mb-6">
            Start free. 3 clips per day, no credit card required.
          </p>
          <Link
            href="/sign-up"
            className="inline-block rounded-lg bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            Get Started Free
          </Link>
        </div>

        {/* Back to blog */}
        <div className="mt-8 text-center">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
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
    </main>
  );
}
