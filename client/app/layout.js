import './globals.css';

export const metadata = {
  title: 'Branch Inventory',
  description: 'Multi-branch stock management',
  icons: { icon: '/favicon.svg' },
};

export const viewport = {
  themeColor: '#0f172a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
