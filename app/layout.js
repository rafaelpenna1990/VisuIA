import './globals.css';
import Script from 'next/script';
import SupportBubble from '../components/SupportBubble';

export const metadata = {
  title: 'VisuIA — Gere imagens e vídeos com IA',
  description: 'Crie imagens, vídeos, sincronia labial e efeitos de cinema com inteligência artificial. Sem mensalidade, pague só pelo que gerar.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Google Ads tag — conversion tracking for the Search campaign */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=AW-18464360538"
          strategy="afterInteractive"
        />
        <Script id="google-ads-gtag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18464360538');
          `}
        </Script>

        {/* OpenAI/ChatGPT Ads pixel — conversion tracking */}
        <Script id="oaiq-pixel" strategy="afterInteractive">
          {`
            !function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");
            oaiq("init",{pixelId:"BLB53QxR2uFvCfCJDUeRB2"});
          `}
        </Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <SupportBubble />
      </body>
    </html>
  );
}
