'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useCallback } from 'react';

import { LiquidGlassButton } from '@/components/ui/liquid-glass-button';

const AuthPanel = () => {
  const { ready, authenticated, login, logout } = usePrivy();

  const handleWalletLogin = useCallback(async () => {
    login({
      loginMethods: ['wallet'],
      walletChainType: 'ethereum-only',
    });
  }, [login]);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="mt-auto">
        {authenticated ? (
          <LiquidGlassButton
            type="button"
            onClick={handleLogout}
            disabled={!ready}
            className="w-full"
          >
            Sign out
          </LiquidGlassButton>
        ) : (
          <LiquidGlassButton
            type="button"
            onClick={handleWalletLogin}
            disabled={!ready}
            className="w-full"
          >
            Sign in with wallet
          </LiquidGlassButton>
        )}
      </div>
    </div>
  );
};

export default AuthPanel;
