// Fase 1 (MVP) da galeria de templates/presets do roadmap — 16 prompts
// prontos organizados por categoria. Clicar preenche o campo de prompt (e a
// proporção sugerida, se o modelo atual a aceitar) — não chama a API, não
// cobra crédito, não toca em billing ou no fluxo de geração. Puramente
// aditivo: um arquivo de dados novo + uma grade de botões na tela inicial.
export const promptTemplates = [
  // ── Anúncio de Produto ──────────────────────────────────────────────────
  {
    id: "produto-estudio",
    category: "Anúncio de Produto",
    title: "Fundo de estúdio",
    icon: "📦",
    prompt:
      "Foto de produto profissional em fundo de estúdio branco, iluminação suave, sombra sutil, estilo catálogo de e-commerce, alta definição",
    aspectRatio: "1:1",
  },
  {
    id: "produto-uso",
    category: "Anúncio de Produto",
    title: "Cena de uso real",
    icon: "☕",
    prompt:
      "Foto de produto em uso real, ambiente aconchegante e bem iluminado, estilo lifestyle, foco nítido no produto, fundo desfocado",
    aspectRatio: "4:3",
  },
  {
    id: "produto-flutuante",
    category: "Anúncio de Produto",
    title: "Flutuando com efeitos",
    icon: "💦",
    prompt:
      "Produto flutuando no ar com respingos de água e partículas ao redor, fundo colorido em gradiente, iluminação dramática de estúdio, estilo anúncio premium",
    aspectRatio: "1:1",
  },
  {
    id: "produto-banner",
    category: "Anúncio de Produto",
    title: "Banner de promoção",
    icon: "🏷️",
    prompt:
      "Produto centralizado com espaço vazio ao redor para texto promocional, fundo em gradiente vibrante, composição limpa estilo banner publicitário",
    aspectRatio: "16:9",
  },

  // ── Post de Rede Social ──────────────────────────────────────────────────
  {
    id: "social-motivacional",
    category: "Post de Rede Social",
    title: "Post motivacional",
    icon: "🌅",
    prompt:
      "Imagem inspiradora e motivacional, paisagem ao amanhecer, cores quentes, estilo fotografia profissional para post de Instagram",
    aspectRatio: "1:1",
  },
  {
    id: "social-evento",
    category: "Post de Rede Social",
    title: "Anúncio de evento",
    icon: "🎉",
    prompt:
      "Cena vibrante e festiva anunciando um evento, confetes e luzes coloridas, composição centrada, estilo flyer digital moderno",
    aspectRatio: "1:1",
  },
  {
    id: "social-story",
    category: "Post de Rede Social",
    title: "Story vertical",
    icon: "📱",
    prompt:
      "Composição vertical vibrante e chamativa para story de Instagram, cores contrastantes, elemento central em destaque",
    aspectRatio: "9:16",
  },
  {
    id: "social-quote",
    category: "Post de Rede Social",
    title: "Quote card elegante",
    icon: "💬",
    prompt:
      "Fundo minimalista elegante com textura sutil, espaço visual para uma frase em destaque, paleta de cores sofisticada, estilo editorial",
    aspectRatio: "1:1",
  },

  // ── Imóvel ───────────────────────────────────────────────────────────────
  {
    id: "imovel-fachada",
    category: "Imóvel",
    title: "Fachada ao entardecer",
    icon: "🌇",
    prompt:
      "Fachada de casa moderna fotografada ao entardecer, céu dourado, iluminação quente nas janelas, estilo fotografia imobiliária premium",
    aspectRatio: "16:9",
  },
  {
    id: "imovel-sala",
    category: "Imóvel",
    title: "Sala aconchegante",
    icon: "🛋️",
    prompt:
      "Sala de estar ampla e aconchegante, luz natural abundante, decoração moderna e clean, estilo revista de arquitetura",
    aspectRatio: "4:3",
  },
  {
    id: "imovel-cozinha",
    category: "Imóvel",
    title: "Cozinha gourmet",
    icon: "🍳",
    prompt:
      "Cozinha moderna estilo gourmet com ilha central, acabamentos premium, iluminação natural, estilo fotografia de imóveis de alto padrão",
    aspectRatio: "4:3",
  },
  {
    id: "imovel-aerea",
    category: "Imóvel",
    title: "Vista aérea",
    icon: "🚁",
    prompt:
      "Vista aérea de drone de uma propriedade residencial, jardim bem cuidado, piscina, luz do meio-dia, estilo fotografia imobiliária de luxo",
    aspectRatio: "16:9",
  },

  // ── Retrato ──────────────────────────────────────────────────────────────
  {
    id: "retrato-corporativo",
    category: "Retrato",
    title: "Corporativo",
    icon: "👔",
    prompt:
      "Retrato profissional corporativo, fundo neutro desfocado, iluminação de estúdio suave, expressão confiante, estilo foto de perfil profissional",
    aspectRatio: "4:3",
  },
  {
    id: "retrato-pb",
    category: "Retrato",
    title: "Artístico P&B",
    icon: "🎭",
    prompt:
      "Retrato artístico em preto e branco, iluminação dramática lateral, alto contraste, estilo editorial de moda",
    aspectRatio: "4:3",
  },
  {
    id: "retrato-cinema",
    category: "Retrato",
    title: "Cinematográfico",
    icon: "🎬",
    prompt:
      "Retrato com iluminação cinematográfica, tons quentes e frios contrastantes, profundidade de campo rasa, estilo still de filme",
    aspectRatio: "16:9",
  },
  {
    id: "retrato-ar-livre",
    category: "Retrato",
    title: "Ao ar livre",
    icon: "🌳",
    prompt:
      "Retrato ao ar livre durante o golden hour, luz dourada suave, fundo natural desfocado, estilo fotografia lifestyle",
    aspectRatio: "4:3",
  },
];
