import LegalPage from '../../components/LegalPage';
import { PRIVACY } from '../../lib/legalContent.js';

export const metadata = {
  title: 'Política de Privacidade — VisuIA',
  description: 'Política de Privacidade da plataforma VisuIA.',
};

export default function Page() {
  return <LegalPage doc={PRIVACY} />;
}
