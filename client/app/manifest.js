export default function manifest() {
  return {
    name: 'Branch Inventory',
    short_name: 'Inventory',
    description: 'Multi-branch stock management',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
