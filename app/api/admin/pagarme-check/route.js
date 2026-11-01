import { NextResponse } from 'next/server';
import { isAdminAuthorized } from '../../../../lib/adminAuth.js';
import { getAllPlans, getSetting } from '../../../../lib/db.js';
import { getPagarmeBaseUrl, getPagarmeKeyKind, isPagarmeConfigured, pagarmeRequest } from '../../../../lib/pagarme.js';
import { ensureCustomer, ensurePlan, createSubscriptionLink, createPackLink } from '../../../../lib/pagarmeBilling.js';
import { PACKS } from '../../../../lib/packs.js';

// Página de diagnóstico: abra no navegador
//   /api/admin/pagarme-check?key=<ADMIN_SECRET>
// Ela tenta, passo a passo, tudo que o checkout precisa na Pagar.me (listar
// planos, criar os planos, criar um cliente de teste, gerar um link de
// assinatura e um de pacote) e mostra o resultado ou o erro de cada passo.
// Não mostra nenhuma chave.
export async function GET(request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const out = {
    configurada: isPagarmeConfigured(),
    tipo_da_chave: getPagarmeKeyKind(),
    endereco: getPagarmeBaseUrl(),
    webhook_token_configurado: Boolean((process.env.PAGARME_WEBHOOK_TOKEN || '').trim()),
    passos: {},
  };
  if (!out.configurada) return NextResponse.json(out);

  async function step(name, fn) {
    try {
      out.passos[name] = { ok: true, resultado: await fn() };
    } catch (err) {
      out.passos[name] = { ok: false, erro: err.message, detalhes: err.details || null };
    }
  }

  const trialDays = Number(getSetting('trial_days', '7')) || 7;
  const plans = getAllPlans();
  const fakeUser = { id: 'diagnostico', email: 'diagnostico@visuia.ai', name: 'Diagnostico VisuIA' };

  await step('1_listar_planos', async () => {
    const list = await pagarmeRequest('GET', '/plans?size=5');
    return `${list?.data?.length ?? 0} plano(s) listado(s)`;
  });

  for (const plan of plans) {
    await step(`2_plano_${plan.id}`, async () => {
      const created = await ensurePlan(plan, trialDays);
      return { id: created.id, nome: created.name, dias_gratis: created.trial_period_days, preco_centavos: plan.amount_cents };
    });
  }

  await step('3_cliente_de_teste', async () => {
    const customer = await ensureCustomer(fakeUser);
    return { id: customer.id, code: customer.code };
  });

  if (plans[0]) {
    await step('4_link_de_assinatura', async () => {
      const url = await createSubscriptionLink(fakeUser, plans[0], { trialDays, entryFeeCents: 0 });
      return { abra_para_testar: url };
    });
  }

  await step('5_link_de_pacote_cartao_e_pix', async () => {
    const url = await createPackLink(fakeUser, PACKS.small);
    return { abra_para_testar: url };
  });

  return NextResponse.json(out, { status: 200 });
}
