import './globals.css';

export const metadata = {
  title: 'VisuIA — Gere imagens e vídeos com IA',
  description: 'Crie imagens, vídeos, sincronia labial e efeitos de cinema com inteligência artificial. Sem mensalidade, pague só pelo que gerar.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}