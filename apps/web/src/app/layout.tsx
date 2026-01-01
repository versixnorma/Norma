import { ClientProviders } from '@/components/ClientProviders';
import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://app.versixnorma.com.br'),
  title: {
    default: 'Norma - Plataforma de Governança Condominial',
    template: '%s | Norma',
  },
  description: 'Gestão inteligente para condomínios com IA assistente. Assembleias, financeiro, comunicados e mais.',
  keywords: ['condomínio', 'gestão', 'síndico', 'assembleia', 'norma', 'governança', 'app', 'PWA'],
  authors: [{ name: 'Versix Solutions', url: 'https://versix.com.br' }],
  creator: 'Versix Solutions',
  publisher: 'Versix Solutions',
  manifest: '/manifest.json',
  applicationName: 'Norma',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Norma',
    startupImage: [
      {
        url: '/splash/splash-1125x2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192x192.png',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://norma.versix.com.br',
    title: 'Norma - Plataforma de Governança Condominial',
    description: 'Gestão inteligente para condomínios com IA assistente',
    siteName: 'Norma',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Norma - Gestão Condominial Inteligente',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Norma - Plataforma de Governança Condominial',
    description: 'Gestão inteligente para condomínios com IA assistente',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f3460' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${montserrat.variable} antialiased`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
