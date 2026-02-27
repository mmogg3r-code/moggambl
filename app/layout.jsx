import './globals.css';

export const metadata = {
  title: 'MogGambl Next Casino',
  description: 'Next.js powered slots with MetaMask and progressive jackpots',
  icons: {
    icon: '/icon.svg'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
