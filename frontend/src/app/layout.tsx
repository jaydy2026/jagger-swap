/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'JAGGER SWAP - Real-Time Portrait Animation',
  description:
    'Animate portraits in real-time using AI. Upload a photo and watch it come alive with your movements.',
  keywords: [
    'portrait animation',
    'AI',
    'real-time',
    'face swap',
    'image animation',
    'computer vision',
  ],
  authors: [{ name: 'JAGGER SWAP Team' }],
  openGraph: {
    title: 'JAGGER SWAP - Real-Time Portrait Animation',
    description:
      'Animate portraits in real-time using AI. Upload a photo and watch it come alive.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JAGGER SWAP - Real-Time Portrait Animation',
    description:
      'Animate portraits in real-time using AI. Upload a photo and watch it come alive.',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
