import { Card } from '@blueprintjs/core';
import { ReactNode } from 'react';

interface AuthInsiderCardProps {
  children: ReactNode;
  classNames?: string;
}

export const AuthInsiderCard = ({ children, classNames = '' }: AuthInsiderCardProps) => {
  return (
    <Card className={`auth-insider-card ${classNames}`}>
      {children}
    </Card>
  );
}; 