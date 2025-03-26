// @ts-nocheck
import React from 'react';
import { Redirect, useLocation } from 'react-router-dom';
import { useIsAuthenticated } from '@/hooks/state';

interface EnsureAuthenticatedProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function EnsureAuthenticated({
  children,
  redirectTo = '/auth/login',
}: EnsureAuthenticatedProps) {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  // Allow auto-auth route to bypass authentication
  if (location.pathname === '/auto_auth') {
    return <>{children}</>;
  }

  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <Redirect to={{ pathname: redirectTo }} />
  );
}
