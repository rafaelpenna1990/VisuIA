// Pacotes avulsos de VisuTokens (recarga única), em centavos de real.
// Usado tanto pelo Stripe quanto pela Pagar.me. Para mudar preços, edite aqui.
export const PACKS = {
  small: { label: '2.000 VisuTokens', amount_cents: 2000 },
  medium: { label: '5.000 VisuTokens', amount_cents: 5000 },
  large: { label: '12.000 VisuTokens', amount_cents: 12000 },
};
