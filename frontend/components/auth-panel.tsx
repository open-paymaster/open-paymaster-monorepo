'use client';

import { useCallback } from 'react';

const AuthPanel = () => {
  const handleLogin = useCallback(async () => {}, []);
  const handleLogout = useCallback(async () => {}, []);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="mt-auto"></div>
    </div>
  );
};

export default AuthPanel;
