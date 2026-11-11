import './globals.css';

export const metadata = {
  title: 'Branch Inventory',
  description: 'Multi-branch stock management',
  icons: { icon: '/favicon.svg' },
};

export const viewport = {
  themeColor: '#090d16',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
