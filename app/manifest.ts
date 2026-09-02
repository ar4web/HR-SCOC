import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SCOS - Saudi Corporate Operating System',
    short_name: 'SCOS',
    description: 'Enterprise HR Management Platform for Saudi Arabia',
    start_url: '/',
    display: 'standalone',
    background_color: '#1b3a5f',
    theme_color: '#1b3a5f',
    dir: 'ltr',
    lang: 'en',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}