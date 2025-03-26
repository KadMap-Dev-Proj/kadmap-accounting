import React, { useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useAuthLogin, useAuthRegister } from '@/hooks/query/authentication';
import { useOrganizationSetup } from '@/hooks/query';
import { AuthInsiderCard } from './_components';
import { AppToaster } from '@/components';
import intl from 'react-intl-universal';

interface LoginValues {
  crediential: string;
  password: string;
}

interface RegisterValues {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

// Organization setup details for new users
const ORG_SETUP_DETAILS = {
  name: 'Kadmap Ltd',
  location: 'NG',
  base_currency: 'NGN',
  language: 'en',
  fiscal_year: 'january',
  timezone: 'Africa/Lagos'
};

export default function HandleUserAutoAuth() {
  const location = useLocation();
  const history = useHistory();
  const { mutateAsync: login } = useAuthLogin({});
  const { mutateAsync: register } = useAuthRegister({});
  const { mutateAsync: organizationSetup } = useOrganizationSetup();

  useEffect(() => {
    const handleAutoAuth = async () => {
      try {
        // Get parameters from URL
        const params = new URLSearchParams(location.search);
        const email = params.get('email');
        const password = params.get('password') || 'defaultPassword123!';
        const first_name = params.get('first_name') || 'Default';
        const last_name = params.get('last_name') || 'User';
        const redirectTo = params.get('redirect') || '/';

        // Log URL parameters
        console.log('URL Parameters ######################################################:', {
          email,
          password,
          first_name,
          last_name,
          redirectTo
        });



        if (!email) {
          AppToaster.show({
            message: intl.get('email_is_required'),
            intent: 'danger',
          });
          return;
        }

        // First try to login
        try {
          const loginValues: LoginValues = {
            crediential: email,
            password,
          };
          // @ts-ignore
          await login(loginValues);
          
          // Try to setup organization (will only work for new users)
          try {
            // @ts-ignore
            await organizationSetup(ORG_SETUP_DETAILS);
          } catch (setupError) {
            // Ignore setup errors as they might mean organization already exists
          }
          
          history.push(redirectTo);
        } catch (error) {
          // If login fails, try to register
          try {
            const registerValues: RegisterValues = {
              first_name: first_name,
              last_name: last_name,
              email,
              password,
            };
            // @ts-ignore
            await register(registerValues);
            
            // After successful registration, try to login again
            const loginValues: LoginValues = {
              crediential: email,
              password,
            };
            // @ts-ignore
            await login(loginValues);

            // Setup organization for new user
            try {
              // @ts-ignore
              await organizationSetup(ORG_SETUP_DETAILS);
            } catch (setupError) {
              // Ignore setup errors as they might mean organization already exists
            }
            
            history.push(redirectTo);
          } catch (registerError) {
            AppToaster.show({
              message: intl.get('registration_failed'),
              intent: 'danger',
            });
          }
        }
      } catch (error) {
        AppToaster.show({
          message: intl.get('something_wentwrong'),
          intent: 'danger',
        });
      }
    };

    handleAutoAuth();
  }, [location, login, register, history, organizationSetup]);

  return (
    <AuthInsiderCard>
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h2>{intl.get('processing_authentication')}</h2>
        <p>{intl.get('please_wait')}</p>
      </div>
    </AuthInsiderCard>
  );
} 