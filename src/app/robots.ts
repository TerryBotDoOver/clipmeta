import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/(app)/', '/auth/callback', '/sign-up'],
      },
    ],
    sitemap: 'https://clipmeta.app/sitemap.xml',
  };
}
