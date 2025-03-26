import { AppToaster as Toaster, FormattedMessage as T, SplashScreen } from '@/components';
import AuthInsider from '@/containers/Authentication/AuthInsider';
import { AuthInsiderCard } from './_components';
import HandleUserAutoAuth from './AutoAuth';

/**
 * Auto Auth welcome page.
 */
export default function AutoAuth() {
  return (
    <AuthInsider classNames={{ content: 'welcome-content' }}>
      <AuthInsiderCard classNames="welcome-card">
      <SplashScreen />
      </AuthInsiderCard>
      <HandleUserAutoAuth />
    </AuthInsider>
  );
}
