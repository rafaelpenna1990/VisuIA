// Texto das páginas legais. Cada seção: { title, body: [ 'parágrafo' | { list: [...] } ] }.
// Versão-base: vale uma revisão do contador ou de um advogado antes de divulgar.
import { COMPANY } from './companyInfo.js';

export const TERMS = {
  title: 'Termos de Uso',
  intro: `Estes Termos regulam o uso da plataforma ${COMPANY.brand}. Ao criar uma conta ou usar o serviço, você declara que leu e concorda com eles.`,
  sections: [
    {
      title: '1. Quem somos',
      body: [
        `A ${COMPANY.brand} é operada por ${COMPANY.legalName}, inscrita no CNPJ ${COMPANY.cnpj}, com sede em ${COMPANY.address}. Contato: ${COMPANY.supportEmail}.`,
      ],
    },
    {
      title: '2. O serviço',
      body: [
        'A plataforma permite criar imagens, vídeos, sincronia labial e cenas de cinema com inteligência artificial, a partir de textos e arquivos que você envia.',
        'Os resultados são gerados por modelos de inteligência artificial de terceiros. Eles podem variar de uma tentativa para outra, e não garantimos que uma geração atenda a um resultado específico.',
      ],
    },
    {
      title: '3. Sua conta',
      body: [
        { list: [
          'Você precisa ter 18 anos ou mais.',
          'As informações do cadastro devem ser verdadeiras e atualizadas.',
          'Você é responsável por manter sua senha em segurança e por tudo que acontece na sua conta.',
          'Cada pessoa pode ter uma conta. Criar várias contas para obter período grátis ou bônus repetidamente é considerado abuso.',
        ] },
      ],
    },
    {
      title: '4. VisuTokens (saldo)',
      body: [
        'O uso da plataforma é pago com VisuTokens (VT). 100 VT equivalem a R$ 1,00.',
        'Cada geração consome saldo de acordo com o modelo e as opções escolhidas. Antes de gerar, reservamos um valor estimado; ao fim da geração, o valor é ajustado ao custo real, e a diferença volta ao seu saldo ou é debitada.',
        'Se uma geração falhar, o saldo reservado é devolvido automaticamente.',
        'O saldo de VisuTokens não zera no fim do mês: o que você não usar acumula.',
      ],
    },
    {
      title: '5. Planos, pacotes e cobrança',
      body: [
        { list: [
          'Planos mensais: a assinatura é cobrada todo mês no cartão de crédito, de forma recorrente, até você cancelar. A cada cobrança aprovada, os VisuTokens do plano são creditados.',
          'Período grátis: quando houver, a primeira cobrança só acontece ao fim do período informado na contratação (hoje, 3 dias), e você pode cancelar antes disso sem ser cobrado. Podemos conceder um bônus de VisuTokens durante o período grátis.',
          'Pacotes avulsos: recargas pagas uma única vez, por cartão ou Pix, sem renovação automática.',
          'Pagamentos são processados pela Pagar.me (Stone). Não armazenamos o número do seu cartão.',
          'Se uma cobrança for recusada, você pode trocar o cartão na área Conta. Sem pagamento aprovado, os VisuTokens do período não são creditados.',
          'Os valores e as condições vigentes aparecem na tela de contratação antes da confirmação.',
        ] },
        'Para cancelar, use o botão "Cancelar assinatura" na área Conta. O cancelamento impede novas cobranças, e você mantém o acesso até o fim do período já pago. As regras de devolução estão na Política de Reembolso.',
      ],
    },
    {
      title: '6. Uso aceitável',
      body: [
        'É proibido usar a plataforma para:',
        { list: [
          'gerar ou compartilhar conteúdo ilegal, e qualquer conteúdo sexual envolvendo menores de idade;',
          'criar imagens, vídeos ou vozes de pessoas reais sem consentimento, especialmente para enganar, difamar, aplicar golpes ou praticar assédio;',
          'violar direitos autorais, marcas, imagem ou outros direitos de terceiros;',
          'tentar burlar limites, cobranças ou a segurança do serviço, ou sobrecarregá-lo de forma abusiva;',
          'revender ou redistribuir o acesso à plataforma sem autorização por escrito.',
        ] },
        'Os provedores de inteligência artificial que usamos têm políticas próprias de conteúdo, e pedidos que as violem podem ser bloqueados. Podemos suspender ou encerrar contas que descumpram estes Termos.',
      ],
    },
    {
      title: '7. Conteúdo, propriedade e responsabilidade',
      body: [
        'Você é responsável pelos textos e arquivos que envia e declara ter os direitos necessários para usá-los. Você nos autoriza a processá-los, e a enviá-los aos provedores de IA, apenas para gerar o resultado que pediu e operar o serviço.',
        'Os resultados gerados podem ser usados por você, inclusive comercialmente, nos limites permitidos pelos termos dos modelos de IA envolvidos. A VisuIA não garante que o resultado seja único, livre de semelhança com obras existentes ou registrável como propriedade intelectual.',
        'Você é responsável pelo uso que faz do conteúdo gerado.',
      ],
    },
    {
      title: '8. Disponibilidade e serviços de terceiros',
      body: [
        'A plataforma depende de provedores externos de inteligência artificial e de infraestrutura. Podem ocorrer instabilidades, manutenções ou mudanças em modelos, e alguns modelos podem ser alterados ou retirados. Buscamos manter o serviço disponível, mas não garantimos funcionamento ininterrupto.',
      ],
    },
    {
      title: '9. Limitação de responsabilidade',
      body: [
        'Dentro do que a lei permite, a VisuIA não responde por danos indiretos, lucros cessantes ou prejuízos decorrentes do uso do conteúdo gerado, nem por indisponibilidades fora do nosso controle. Nada nestes Termos afasta direitos que o Código de Defesa do Consumidor garante a você.',
      ],
    },
    {
      title: '10. Alterações',
      body: [
        'Podemos atualizar estes Termos. Mudanças relevantes serão avisadas no site ou por e-mail. Continuar usando o serviço depois do aviso significa que você concorda com a nova versão.',
      ],
    },
    {
      title: '11. Lei aplicável e foro',
      body: [
        'Estes Termos seguem a lei brasileira. Para consumidores, fica eleito o foro do seu domicílio. Nos demais casos, o foro da comarca de Ipatinga/MG.',
      ],
    },
    {
      title: '12. Contato',
      body: [`Dúvidas, pedidos e reclamações: ${COMPANY.supportEmail}.`],
    },
  ],
};

export const PRIVACY = {
  title: 'Política de Privacidade',
  intro: `Esta política explica como ${COMPANY.legalName} (${COMPANY.brand}), CNPJ ${COMPANY.cnpj}, trata dados pessoais, conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018). A empresa é a controladora desses dados.`,
  sections: [
    {
      title: '1. Dados que coletamos',
      body: [
        { list: [
          'Conta: e-mail e senha (guardada de forma criptografada, nunca em texto) ou dados básicos do login com Google ou Facebook.',
          'Pagamento: nome, CPF, celular e dados do cartão ou do Pix, informados no formulário de pagamento. Os dados do cartão são enviados direto à Pagar.me (Stone) e não ficam no nosso servidor. Guardamos o nome, o CPF, o e-mail, o celular, o valor e a data de cada pagamento aprovado, para emitir nota fiscal.',
          'Conteúdo: os textos (prompts), imagens, vídeos e áudios que você envia, e as gerações que cria.',
          'Uso e dados técnicos: registros de acesso, endereço IP, tipo de navegador, páginas visitadas e erros.',
          'Comunicação: mensagens que você nos envia pelo suporte.',
        ] },
      ],
    },
    {
      title: '2. Para que usamos',
      body: [
        { list: [
          'Prestar o serviço, gerar o conteúdo que você pediu e manter sua conta (execução de contrato).',
          'Cobrar, evitar fraude e emitir notas fiscais (execução de contrato e obrigação legal).',
          'Enviar avisos sobre sua conta, cobranças e mudanças no serviço (execução de contrato).',
          'Enviar novidades e ofertas, com possibilidade de você pedir para não receber mais (legítimo interesse).',
          'Medir a eficácia de anúncios e melhorar o site (legítimo interesse e, quando exigido, consentimento).',
          'Cumprir obrigações legais e proteger direitos da empresa.',
        ] },
      ],
    },
    {
      title: '3. Com quem compartilhamos',
      body: [
        'Só compartilhamos o necessário, com empresas que nos ajudam a operar:',
        { list: [
          'Pagar.me / Stone: processamento de pagamentos.',
          'Provedores de inteligência artificial (incluindo Muapi.ai e os desenvolvedores dos modelos usados): recebem seus prompts e arquivos para gerar o resultado.',
          'Hospedagem e infraestrutura (Railway) e envio de e-mails (Resend).',
          'Google e Facebook: quando você escolhe entrar com essas contas.',
          'Google Ads e OpenAI Ads: ferramentas de medição de conversão de anúncios, que usam cookies ou identificadores do navegador.',
          'Contabilidade e emissão de notas fiscais.',
          'Autoridades, quando a lei exigir.',
        ] },
        'Não vendemos seus dados pessoais.',
        'Alguns desses parceiros ficam fora do Brasil, então seus dados podem ser tratados no exterior, com as salvaguardas previstas na LGPD.',
      ],
    },
    {
      title: '4. Por quanto tempo guardamos',
      body: [
        'Mantemos os dados enquanto sua conta estiver ativa e pelo tempo necessário para cumprir obrigações legais. Dados fiscais e de pagamento são guardados pelos prazos exigidos pela legislação, em geral 5 anos. Você pode pedir a exclusão da conta, ressalvados os dados que a lei nos obriga a manter.',
      ],
    },
    {
      title: '5. Seus direitos',
      body: [
        `Você pode pedir, a qualquer momento, confirmação de tratamento, acesso, correção, anonimização ou exclusão de dados, portabilidade, informação sobre compartilhamento e revogação de consentimento. Escreva para ${COMPANY.supportEmail} usando o e-mail da sua conta. Responderemos no prazo legal. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).`,
      ],
    },
    {
      title: '6. Cookies e anúncios',
      body: [
        'Usamos cookies e tecnologias parecidas para manter você conectado, lembrar preferências e medir anúncios. Você pode bloquear ou apagar cookies nas configurações do navegador, mas partes do site podem deixar de funcionar.',
      ],
    },
    {
      title: '7. Segurança',
      body: [
        'Adotamos medidas técnicas e organizacionais para proteger os dados, como senhas criptografadas, conexão segura (HTTPS) e acesso restrito. Nenhum sistema é totalmente imune, e em caso de incidente relevante avisaremos os afetados e a ANPD, como a lei determina.',
      ],
    },
    {
      title: '8. Crianças e adolescentes',
      body: ['O serviço é destinado a maiores de 18 anos. Não coletamos intencionalmente dados de menores.'],
    },
    {
      title: '9. Alterações e contato',
      body: [
        `Podemos atualizar esta política, e a data da última versão fica no topo desta página. Para falar sobre privacidade, inclusive com o encarregado de dados: ${COMPANY.supportEmail}.`,
      ],
    },
  ],
};

export const REFUND = {
  title: 'Política de Reembolso e Cancelamento',
  intro: 'Veja como funcionam o cancelamento da assinatura e a devolução de valores.',
  sections: [
    {
      title: '1. Período grátis',
      body: [
        'Se a sua assinatura tiver período grátis, você pode cancelar antes de ele terminar e não será cobrado. A primeira cobrança acontece ao fim do período informado na contratação.',
      ],
    },
    {
      title: '2. Direito de arrependimento (7 dias)',
      body: [
        'Como a contratação é feita pela internet, você pode desistir em até 7 dias corridos contados da cobrança, conforme o artigo 49 do Código de Defesa do Consumidor. Nesse caso devolvemos o valor pago, descontando o equivalente aos VisuTokens que você já tiver usado em gerações concluídas.',
        'Vale para assinaturas e para pacotes avulsos.',
      ],
    },
    {
      title: '3. Cancelar a assinatura',
      body: [
        'Você pode cancelar a qualquer momento na área Conta, em "Cancelar assinatura". O cancelamento impede novas cobranças. Você mantém o acesso até o fim do período já pago, e o saldo de VisuTokens já creditado continua disponível na sua conta.',
        'Passados os 7 dias da cobrança, não fazemos devolução proporcional do período em andamento.',
      ],
    },
    {
      title: '4. Gerações que falham',
      body: ['Se uma geração falhar, o valor reservado volta automaticamente ao seu saldo. Não é preciso pedir.'],
    },
    {
      title: '5. Cobrança indevida ou em duplicidade',
      body: [
        'Se você foi cobrado por engano, em duplicidade ou depois de cancelar, devolvemos o valor integral cobrado indevidamente. Avise-nos o quanto antes.',
      ],
    },
    {
      title: '6. Como pedir',
      body: [
        `Envie um e-mail para ${COMPANY.supportEmail} com o e-mail da sua conta e a data da cobrança. Respondemos em até 5 dias úteis.`,
        'O reembolso é feito pelo mesmo meio do pagamento. No cartão de crédito, o estorno pode aparecer em até duas faturas, conforme o banco emissor. No Pix, o valor volta para a conta de origem.',
      ],
    },
  ],
};
