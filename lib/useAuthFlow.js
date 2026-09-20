'use client';

// lib/useAuthFlow.js
//
// The "click something → login/signup → land in the right place" logic,
// shared by the homepage and every /criar, /modelos, /como-funciona page
// so it's written once. Each page calls this hook and renders
// <AuthFlowModals auth={auth} /> once — see components/AuthFlowModals.js.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuthFlow(redirectTab) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'signup'
  const [showSubModal, setShowSubModal] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setIsLoggedIn(!!data.user))
      .catch(() => {});
  }, []);

  const studioUrl = () => `/studio?tab=${redirectTab || 'image'}`;

  const goToStudioOrAuth = (mode) => {
    if (isLoggedIn) {
      router.push(studioUrl());
    } else {
      setAuthModal(mode);
    }
  };

  const handleAuthenticated = (user, mode) => {
    setAuthModal(null);
    // First-time signup → show the plan popup right here; a plain login
    // just wants back into the studio, on the type they were browsing.
    if (mode === 'signup') {
      setShowSubModal(true);
    } else {
      router.push(studioUrl());
    }
  };

  return {
    isLoggedIn,
    goToStudioOrAuth,
    authModal, setAuthModal, handleAuthenticated,
    showSubModal, setShowSubModal,
    showTopUp, setShowTopUp,
    studioUrl,
  };
}
