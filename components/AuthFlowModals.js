'use client';

import AuthModal from './AuthModal';
import SubscriptionModal from './SubscriptionModal';
import TopUpModal from './TopUpModal';

// Renders whichever modal the shared useAuthFlow() state calls for. One
// line per page: {auth && <AuthFlowModals auth={auth} />}
export default function AuthFlowModals({ auth }) {
  return (
    <>
      {auth.authModal && (
        <AuthModal
          initialMode={auth.authModal}
          onAuthenticated={auth.handleAuthenticated}
          onClose={() => auth.setAuthModal(null)}
        />
      )}

      {auth.showSubModal && (
        <SubscriptionModal
          onClose={() => { auth.setShowSubModal(false); window.location.href = auth.studioUrl(); }}
          onBuyWithoutSubscription={() => { auth.setShowSubModal(false); auth.setShowTopUp(true); }}
        />
      )}

      {auth.showTopUp && (
        <TopUpModal onClose={() => { auth.setShowTopUp(false); window.location.href = auth.studioUrl(); }} />
      )}
    </>
  );
}
