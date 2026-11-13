import LegalPage from '../../components/LegalPage';
import { TERMS } from '../../lib/legalContent.js';

export const metadata = {
  title: 'Termos de Uso — VisuIA',
  description: 'Termos de Uso da plataforma VisuIA.',
};

export default function Page() {
  return <LegalPage doc={TERMS} />;
}
