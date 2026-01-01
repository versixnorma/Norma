import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        {/* Link para o Manifest do PWA */}
        <link rel="manifest" href="/manifest.json" />
        {/* Cores para o navegador */}
        <meta name="theme-color" content="#4f46e5" />
        {/* Tags PWA para iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Norma" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
