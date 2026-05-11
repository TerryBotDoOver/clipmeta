import { MetadataRoute } from 'next';
import { getBlogPosts } from '@/lib/blog';

const BASE_URL = 'https://clipmeta.app';
const SEO_GENERATOR_PAGES = [
  'stock-video-keyword-generator',
  'blackbox-metadata-generator',
  'pond5-keyword-generator',
  'adobe-stock-video-keywords',
  'shutterstock-video-keywording',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const blogPosts = getBlogPosts().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));
  const generatorPages = SEO_GENERATOR_PAGES.map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  return [
    { url: `${BASE_URL}/`,                          lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE_URL}/pricing`,                   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/blog`,                      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${BASE_URL}/blackbox`,                  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/lp/stock-footage-metadata`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/lp/bulk-keywording`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE_URL}/lp/blackbox-upload`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/legal/terms`,               lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE_URL}/legal/privacy`,             lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    ...generatorPages,
    ...blogPosts,
  ];
}
