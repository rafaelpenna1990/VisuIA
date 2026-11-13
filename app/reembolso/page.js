import LegalPage from '../../components/LegalPage';
import { REFUND } from '../../lib/legalContent.js';

export const metadata = {
  title: 'Política de Reembolso e Cancelamento — VisuIA',
  description: 'Política de Reembolso e Cancelamento da plataforma VisuIA.',
};

export default function Page() {
  return <LegalPage doc={REFUND} />;
}
