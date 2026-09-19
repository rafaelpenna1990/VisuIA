import { Suspense } from 'react';
import StandaloneShell from '@/components/StandaloneShell';

export const metadata = {
  title: 'Studio — Open Higgsfield AI',
};

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StandaloneShell />
    </Suspense>
  );
}