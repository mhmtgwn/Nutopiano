import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nutopiano POS',
    short_name: 'Nutopiano',
    description: 'Nutopiano POS uygulamasi - offline satis destegi',
    start_url: '/pos',
    display: 'standalone',
    background_color: '#f4f5f2',
    theme_color: '#1a3c34',
    lang: 'tr',
    scope: '/',
    icons: [
      {
        src: '/nutopiano-logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/nutopiano-logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  };
}

