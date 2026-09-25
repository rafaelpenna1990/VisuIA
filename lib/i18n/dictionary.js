// lib/i18n/dictionary.js
//
// Portuguese is the source of truth for the whole site (matches every PT
// string already hardcoded in components) — the "pt" section here exists
// mainly so useTranslation() has something to fall back to if a key is
// ever missing from "en". The "en" section is what actually gets shown
// to visitors the middleware detects as non-Brazilian.
//
// Phase 1 covers the whole ad-to-signup funnel: header, footer, homepage,
// /criar/*, /modelos/*, /como-funciona, and the auth/subscription/top-up
// modals. The authenticated studio itself (Phase 2) is a separate,
// much larger dictionary — see studioDictionary.js.

export const dictionary = {
  pt: {
    header: {
      navCreate: 'O que você pode criar',
      navModels: 'Os modelos por trás da mágica',
      navHow: 'Como funciona',
      myAccount: 'Minha Conta',
      myStudio: 'Meu Estúdio',
      login: 'Entrar',
      signup: 'Cadastrar',
      seeModelsHere: 'Veja os modelos usados aqui',
    },
    footer: {
      madeInBrazil: 'Feito no Brasil',
    },
    hero: {
      defaultTitle: 'Sua ideia vira imagem, vídeo ou cena de cinema **em segundos.**',
      defaultSubtitle: 'Escolha abaixo o que você quer criar e já comece a mexer nas opções — sem precisar de software caro.',
    },
    promo: {
      default: '🎁 7 dias grátis + 500 VisuTokens de bônus só por assinar',
    },
    home: {
      payOnlyTitle: 'Pague só pelo que gerar',
      payOnlyDesc: 'Sem mensalidade obrigatória. Compra VisuTokens quando precisar, e cada geração debita só o valor exato dela.',
      startFreeNow: 'Começar grátis agora',
    },
    criar: {
      createFreeAccount: 'Criar conta grátis e testar',
    },
    modelos: {
      titlePrefix: 'Modelos de',
      descPrefix: 'A VisuIA combina os melhores modelos de IA do mercado pra',
      descSuffix: '— você escolhe o resultado, a gente cuida da tecnologia.',
      createFreeAccount: 'Criar conta grátis e testar',
    },
    comoFunciona: {
      title: 'Como funciona',
      subtitle: 'Do cadastro ao arquivo pronto, em três passos simples.',
      createFreeAccount: 'Criar conta grátis',
    },
    auth: {
      loginSubtitle: 'Entre na sua conta.',
      signupSubtitle: 'Crie sua conta para começar.',
      continueWithGoogle: 'Continuar com Google',
      or: 'ou',
      email: 'E-mail',
      password: 'Senha',
      pleaseWait: 'Aguarde…',
      login: 'Entrar',
      createAccount: 'Criar conta',
      noAccountYet: 'Não tem conta? Criar uma',
      alreadyHaveAccount: 'Já tem conta? Entrar',
      genericError: 'Algo deu errado',
      close: 'Fechar',
    },
    subscription: {
      welcomeOffer: 'Oferta de boas-vindas',
      titlePrefix: 'Ganhe',
      titleSuffix: 'VisuTokens de graça',
      descEntryFeePrefix: 'Escolha um plano agora e comece com',
      descEntryFeeMiddle: 'dias de acesso por',
      descEntryFeeSuffix: 'caem na sua conta na hora. Depois do 7º dia, cobramos a mensalidade normal do plano.',
      descFreePrefix: 'Escolha um plano agora e comece com',
      descFreeDays: '7 dias grátis',
      descFreeSuffix: 'caem na sua conta na hora, sem cobrar nada do cartão até o 7º dia.',
      freeNowBadge: 'grátis agora',
      perMonthAfterTrial: '/mês depois do 7º dia',
      tokensPerMonth: 'VisuTokens/mês',
      redirecting: 'Redirecionando…',
      startFree: 'Começar grátis',
      startFor: 'Começar por',
      preferBuyTokens: 'Prefiro comprar tokens sem assinatura',
      genericError: 'Não foi possível iniciar a assinatura',
    },
    topup: {
      title: 'Adicionar VisuTokens',
      subtitle: 'Pagamento seguro via Stripe.',
      redirecting: 'Redirecionando…',
      close: 'Fechar',
      genericError: 'Não foi possível iniciar o pagamento',
    },
  },

  en: {
    header: {
      navCreate: 'What you can create',
      navModels: 'The models behind the magic',
      navHow: 'How it works',
      myAccount: 'My Account',
      myStudio: 'My Studio',
      login: 'Log in',
      signup: 'Sign up',
      seeModelsHere: 'See the models used here',
    },
    footer: {
      madeInBrazil: 'Made in Brazil',
    },
    hero: {
      defaultTitle: 'Your idea becomes an image, video, or cinematic scene **in seconds.**',
      defaultSubtitle: 'Pick what you want to create below and start playing with the options — no expensive software needed.',
    },
    promo: {
      default: '🎁 7-day free trial + 500 bonus VisuTokens just for subscribing',
    },
    home: {
      payOnlyTitle: 'Pay only for what you generate',
      payOnlyDesc: 'No mandatory monthly fee. Buy VisuTokens whenever you need them, and each generation only charges its exact cost.',
      startFreeNow: 'Start free now',
    },
    criar: {
      createFreeAccount: 'Create a free account and try it',
    },
    modelos: {
      titlePrefix: 'Models for',
      descPrefix: 'VisuIA combines the best AI models on the market for',
      descSuffix: '— you pick the result, we handle the technology.',
      createFreeAccount: 'Create a free account and try it',
    },
    comoFunciona: {
      title: 'How it works',
      subtitle: 'From signing up to your finished file, in three simple steps.',
      createFreeAccount: 'Create a free account',
    },
    auth: {
      loginSubtitle: 'Log in to your account.',
      signupSubtitle: 'Create your account to get started.',
      continueWithGoogle: 'Continue with Google',
      or: 'or',
      email: 'Email',
      password: 'Password',
      pleaseWait: 'Please wait…',
      login: 'Log in',
      createAccount: 'Create account',
      noAccountYet: "Don't have an account? Create one",
      alreadyHaveAccount: 'Already have an account? Log in',
      genericError: 'Something went wrong',
      close: 'Close',
    },
    subscription: {
      welcomeOffer: 'Welcome offer',
      titlePrefix: 'Get',
      titleSuffix: 'free VisuTokens',
      descEntryFeePrefix: 'Pick a plan now and start with',
      descEntryFeeMiddle: 'days of access for',
      descEntryFeeSuffix: 'VisuTokens land in your account right away. After day 7, we charge the plan\u2019s normal monthly price.',
      descFreePrefix: 'Pick a plan now and start with a',
      descFreeDays: '7-day free trial',
      descFreeSuffix: 'VisuTokens land in your account right away — nothing is charged to your card until day 7.',
      freeNowBadge: 'free right now',
      perMonthAfterTrial: '/mo after day 7',
      tokensPerMonth: 'VisuTokens/mo',
      redirecting: 'Redirecting…',
      startFree: 'Start free',
      startFor: 'Start for',
      preferBuyTokens: "I'd rather buy tokens without subscribing",
      genericError: 'Could not start the subscription',
    },
    topup: {
      title: 'Add VisuTokens',
      subtitle: 'Secure payment via Stripe.',
      redirecting: 'Redirecting…',
      close: 'Close',
      genericError: 'Could not start the payment',
    },
  },
};
