// lib/landing-data.js
//
// Shared content for the marketing site — the homepage nav dropdowns AND
// the dedicated /criar/[slug], /modelos/[slug], /como-funciona pages all
// read from here, so the copy only lives in one place.

export const FEATURES = [
  {
    id: 'image',
    slug: 'imagem',
    title: 'Imagem',
    tagline: 'Crie e edite imagens com IA',
    desc: 'Crie imagens do zero a partir de uma descrição, ou edite fotos que você já tem: troque fundo, estilo, roupa, iluminação.',
    longDesc: 'Descreva o que você quer em texto simples e receba uma imagem pronta em segundos — ou envie uma foto sua e peça pra mudar o que quiser, mantendo seu rosto e identidade. Ótimo pra fotos de produto, retratos, artes pra redes sociais e muito mais.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    id: 'video',
    slug: 'video',
    title: 'Vídeo',
    tagline: 'Anime fotos e crie vídeos com IA',
    desc: 'Anime uma foto parada, ou descreva uma cena em texto e receba um vídeo curto pronto pra postar.',
    longDesc: 'Transforme uma imagem parada em vídeo com movimento realista, ou descreva uma cena inteira em texto e deixe a IA criar do zero — com áudio sincronizado, dependendo do modelo escolhido. Ideal pra conteúdo de redes sociais, anúncios e prototipagem criativa.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    id: 'lipsync',
    slug: 'sincronia-labial',
    title: 'Sincronia Labial',
    tagline: 'Sincronize áudio e vídeo automaticamente',
    desc: 'Sincronize um áudio com um retrato ou vídeo, e a boca acompanha a fala automaticamente.',
    longDesc: 'Envie qualquer áudio (sua voz, um locutor, até uma dublagem) e uma foto de rosto ou vídeo — a IA sincroniza os lábios com a fala automaticamente. Muito usado pra avatares digitais, dublagem e conteúdo educacional.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      </svg>
    ),
  },
  {
    id: 'cinema',
    slug: 'cinema',
    title: 'Cinema',
    tagline: 'Efeitos de câmera e lente profissionais',
    desc: 'Aplique lentes e câmeras de cinema de verdade nas suas cenas, do 16mm vintage ao digital 8K.',
    longDesc: 'Escolha entre câmeras e lentes de cinema reais (do 16mm vintage ao digital 8K, anamórficas, macro, prime clássicas) e controle distância focal e abertura, igual um diretor de fotografia de verdade — tudo isso aplicado automaticamente na hora de gerar sua imagem.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 7l-7 5 7 5V7z" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
];

export const MODEL_HIGHLIGHTS = {
  image: [
    { name: 'Nano Banana', desc: 'Edita fotos existentes mantendo o rosto e a identidade da pessoa — troca fundo, roupa, estilo, sem perder a semelhança.' },
    { name: 'Flux', desc: 'Cria imagens do zero com alta qualidade e riqueza de detalhes, ótimo pra fotos realistas.' },
    { name: 'Midjourney v7', desc: 'Visual artístico e composições criativas, ideal pra ilustrações e peças com estilo próprio.' },
  ],
  video: [
    { name: 'Kling', desc: 'Movimento fluido e realista, com boa consistência de cena do início ao fim do vídeo.' },
    { name: 'Veo 3', desc: 'Gera o vídeo já com áudio sincronizado, incluindo fala e efeitos sonoros.' },
    { name: 'Sora 2', desc: 'Cenas complexas com física e iluminação realistas, ótimo pra sequências mais elaboradas.' },
    { name: 'Seedance', desc: 'Geração rápida com ótimo custo-benefício, boa pra quem precisa de volume de conteúdo.' },
  ],
  lipsync: [
    { name: 'Sync', desc: 'Sincronização labial precisa a partir de qualquer áudio, funciona bem em vídeos e fotos.' },
    { name: 'Veed Lipsync', desc: 'Resultado natural mesmo com ângulos de rosto variados.' },
    { name: 'Infinite Talk', desc: 'Boa opção pra vídeos mais longos, mantendo a sincronia do começo ao fim.' },
  ],
  cinema: [
    { name: 'Câmeras profissionais', desc: 'Do 16mm vintage ao digital 8K — escolha o corpo de câmera que dá o visual certo pra sua cena.' },
    { name: 'Lentes de cinema', desc: 'Anamórficas, macro, prime clássicas: cada lente muda completamente a textura da imagem.' },
    { name: 'Distância focal e abertura', desc: 'Controle a perspectiva e a profundidade de campo igual um diretor de fotografia de verdade.' },
  ],
};

export const STEPS = [
  {
    n: '1',
    slug: 'crie-sua-conta',
    title: 'Crie sua conta',
    desc: 'Cadastro rápido, sem burocracia, e você já começa com créditos grátis pra testar.',
    longDesc: 'Leva menos de um minuto: só e-mail e senha (ou entre direto com o Google). Assim que sua conta é criada, você já pode escolher assinar um plano com 7 dias grátis, ou comprar VisuTokens avulsos, sem compromisso mensal.',
  },
  {
    n: '2',
    slug: 'descreva-o-que-voce-quer',
    title: 'Descreva o que você quer',
    desc: 'Um texto simples já basta. Escolha o modelo, o formato, e deixa a IA trabalhar.',
    longDesc: 'Escreva em português mesmo, com suas próprias palavras. Escolha o modelo de IA, a proporção, a duração (pra vídeo) e outros detalhes — ou deixa no padrão e só clica em Gerar. A geração leva de segundos a poucos minutos, dependendo do tipo.',
  },
  {
    n: '3',
    slug: 'baixe-e-use',
    title: 'Baixe e use',
    desc: 'Em segundos você tem o arquivo pronto, sem marca d\u2019água, seu pra usar onde quiser.',
    longDesc: 'O resultado fica salvo na sua conta, em "Meus Projetos", e você pode baixar quando quiser — sem marca d\u2019água, em alta qualidade, pronto pra postar, imprimir ou usar onde precisar.',
  },
];

export function findFeatureBySlug(slug) {
  return FEATURES.find((f) => f.slug === slug);
}
