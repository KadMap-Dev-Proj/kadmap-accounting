import { useLocation, useHistory } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import { Intent, Button, Spinner, Card, Collapse } from '@blueprintjs/core';
// import { useAuthRegister, useAuthLogin, useOrganizationSetup } from '@/hooks/query';
import { AppToaster } from '@/components';
import intl from 'react-intl-universal';
import * as R from 'ramda';
import { useAuthActions, useSetAuthToken, useAuthOrganizationId } from '@/hooks/state';
import { setCookie } from '@/utils';
import { useAuthLogin, useAuthRegister } from '@/hooks/query/authentication';
import withOrganizationActions from '@/containers/Organization/withOrganizationActions';
import { compose } from '@/utils';

// Import error transformation functions from the Authentication container
import {
  transformRegisterErrorsToForm,
  transformRegisterToastMessages,
} from '@/containers/Authentication/utils';
import { useOrganizationSetup } from '@/hooks/query/organization';

// Error interface definition
interface ApiError {
  response?: {
    status?: number;
    data?: {
      errors?: Array<{
        type?: string;
        code?: number;
        message?: string;
      }>;
    };
  };
}

// API Response interface definition
interface ApiResponse {
  data: {
    token: string;
    user: {
      id: string;
    };
    tenant: {
      id: string;
      organization_id: string;
      metadata?: {
        language?: string;
      };
    };
  };
}

// Registration data interface
interface RegistrationData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

// Login data interface
interface LoginData {
  crediential: string;
  password: string;
}

// Organization setup data interface
interface OrganizationSetupData {
  name: string;
  location: string;
  base_currency: string;
  language: string;
  fiscal_year: string;
  timezone: string;
}

// Props interface for the AutoAuthComponent
interface AutoAuthComponentProps {
  // From withOrganizationActions HOC
  setOrganizationSetupCompleted: (completed: boolean) => void;
}

// Create a custom hook to handle query params
function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

const AutoAuthComponent: React.FC<AutoAuthComponentProps> = ({ setOrganizationSetupCompleted }) => {
  const query = useQuery();
  const history = useHistory();
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isSettingUpOrg, setIsSettingUpOrg] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);
  const [loginSuccess, setLoginSuccess] = useState<boolean>(false);
  const [orgSetupSuccess, setOrgSetupSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedParams, setShowAdvancedParams] = useState<boolean>(false);
  const [emailExists, setEmailExists] = useState<boolean>(false);
  const [tokenRefreshing, setTokenRefreshing] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [orgSetupRetryCount, setOrgSetupRetryCount] = useState<number>(0);
  const [orgIdRetryCount, setOrgIdRetryCount] = useState<number>(0);
  
  // Maximum number of retries to prevent infinite loops
  const MAX_RETRIES = 2;
  const MAX_ORG_ID_RETRIES = 3;
  
  // Get auth token setter and organization ID
  const setAuthToken = useSetAuthToken();
  const organizationId = useAuthOrganizationId();
  const { setLogout } = useAuthActions();
  
  // Get login-specific query parameters
  const crediential = query.get('crediential'); // Email address for login
  const password = query.get('password');       // Password for login
  
  // Get registration-specific query parameters
  const first_name = query.get('first_name');
  const last_name = query.get('last_name');
  const email = query.get('email') || crediential; // Use crediential as fallback for email
  
  // Get organization setup parameters
  const org_name = query.get('org_name');
  const org_location = query.get('org_location');
  const org_currency = query.get('org_currency') || 'USD';
  const org_language = query.get('org_language') || 'en';
  const org_fiscal_year = query.get('org_fiscal_year') || 'january';
  const org_timezone = query.get('org_timezone') || 'America/New_York';
  
  // Auto setup parameter
  const autoSetup = query.get('autoSetup') === 'true';
  
  // Get all query parameters as an object
  const allParams: Record<string, string> = {};
  query.forEach((value, key) => {
    allParams[key] = value;
  });
  
  // Set up organization setup mutation
  const { mutateAsync: setupOrganization } = useOrganizationSetup();
  
  // Function to mark the organization setup as completed
  const markOrganizationSetupCompleted = useCallback((): void => {
    try {
      // Call the HOC-provided function
      setOrganizationSetupCompleted(true);
    } catch (err) {
      console.error('Failed to mark organization setup as completed:', err);
    }
  }, [setOrganizationSetupCompleted]);
  
  const handleOrgSetupSuccess = useCallback((): void => {
    setOrgSetupSuccess(true);
    setIsSettingUpOrg(false);
    
    // Mark the organization setup as completed to bypass the initialization page
    markOrganizationSetupCompleted();
    
    AppToaster.show({
      message: 'Organization setup completed! Redirecting to dashboard...',
      intent: Intent.SUCCESS,
    });
    
    // Redirect to dashboard
    setTimeout(() => {
      history.push('/');
    }, 1500);
  }, [history, markOrganizationSetupCompleted]);
  
  const handleOrgSetupError = (error: ApiError): void => {
    setIsSettingUpOrg(false);
    setError('Organization setup failed.');
    
    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      errors.forEach((err: { type?: string; message?: string }) => {
        AppToaster.show({
          message: err.message || 'An error occurred during organization setup',
          intent: Intent.DANGER,
        });
      });
    }
  };
  
  // Set up auth mutations
  const { mutateAsync: register } = useAuthRegister({});
  const { mutateAsync: login } = useAuthLogin({
    onSuccess: (res: ApiResponse) => {
      // Save token in cookie and state to ensure it's available for subsequent requests
      if (res.data && res.data.token) {
        setCookie('token', res.data.token);
        setAuthToken(res.data.token);
      }
      
      // Make sure organization_id and tenant_id are set in cookies
      if (res.data && res.data.tenant) {
        // Ensure these cookies are set first
        setCookie('organization_id', res.data.tenant.organization_id);
        setCookie('tenant_id', res.data.tenant.id);
        setCookie('authenticated_user_id', res.data.user.id);
        
        // Set language preference if available
        if (res.data?.tenant?.metadata?.language) {
          setCookie('locale', res.data.tenant.metadata.language);
        }
      }
      
      // Set login as successful and show success message
      setLoginSuccess(true);
      setIsLoggingIn(false);
      AppToaster.show({
        message: 'Login successful!',
        intent: Intent.SUCCESS,
      });
      
      // Reset organization-related retry counters after successful login
      setOrgSetupRetryCount(0);
      setOrgIdRetryCount(0);
      
      // If we have organization parameters, proceed with setup
      if (autoSetup && org_name && org_location) {
        // Use a longer delay to ensure the token and organization ID are properly set in Redux state
        AppToaster.show({
          message: 'Preparing organization setup...',
          intent: Intent.PRIMARY,
        });
        
        // Ensure the organization ID is loaded in Redux state before proceeding
        // Use a longer delay to give Redux state time to update with the new organization ID
        setTimeout(() => {
          // Check if the organization might already be set up
          if (res.data?.tenant?.organization_id) {
            // If the user already has an organization ID, it's likely set up or in progress
            handleOrgSetup();
          } else {
            // Otherwise, proceed with normal organization setup
            handleOrgSetup();
          }
        }, 2500); // longer delay to ensure state is properly updated
      } else {
        // If no organization setup is needed, redirect to setup page
        AppToaster.show({
          message: 'Redirecting to setup wizard...',
          intent: Intent.PRIMARY,
        });
        
        setTimeout(() => {
          history.push('/setup');
        }, 1000);
      }
    },
    onError: (error: ApiError) => {
      setIsLoggingIn(false);
      setError('Login failed. Please check your credentials.');
      
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;  
        errors.forEach((err: { type?: string; message?: string }) => {
          AppToaster.show({
            message: err.message || 'An error occurred during login',
            intent: Intent.DANGER,
          });
        });
      }
    }
  });
  
  // Function to refresh the token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!email || !password || tokenRefreshing) {
      return false;
    }
    
    // Check if we've exceeded the maximum retry count
    if (retryCount >= MAX_RETRIES) {
      AppToaster.show({
        message: 'Maximum authentication retry attempts reached. Please try again manually.',
        intent: Intent.DANGER,
      });
      setError('Maximum authentication retry attempts reached. Please try again manually.');
      setTokenRefreshing(false);
      return false;
    }
    
    setTokenRefreshing(true);
    setRetryCount(prevCount => prevCount + 1);
    
    try {
      const loginData: LoginData = {
        crediential: email,
        password
      };
      
      AppToaster.show({
        message: `Refreshing authentication (attempt ${retryCount + 1}/${MAX_RETRIES})...`,
        intent: Intent.PRIMARY,
      });
      
      await login(loginData as any);
      setTokenRefreshing(false);
      setRetryCount(0); // Reset the retry counter on success
      return true;
    } catch (err: any) {
      setTokenRefreshing(false);
      return false;
    }
  }, [email, password, tokenRefreshing, retryCount, MAX_RETRIES, login]);
  
  // Handle login with existing credentials when email already exists
  const handleLoginWithExistingCredentialsRef = useCallback(async (): Promise<void> => {
    if (!email || !password) {
      return;
    }
    
    // Check if we're already logging in to prevent multiple attempts
    if (isLoggingIn) {
      return;
    }
    
    setIsLoggingIn(true);
    setError(null);
    
    try {
      AppToaster.show({
        message: 'This email is already registered. Attempting to login with provided credentials...',
        intent: Intent.PRIMARY,
      });
      
      await login({
        crediential: email,
        password
      } as any);
    } catch (err) {
      // Login errors are handled in onError callback
      // Make sure we're not stuck in a loading state
      setIsLoggingIn(false);
      
      // Show a specific message for login failure after email exists
      AppToaster.show({
        message: 'Login failed. The provided password may not match the existing account.',
        intent: Intent.WARNING,
      });
    }
  }, [email, password, isLoggingIn, login]);
  
  // Store the function in a ref to break circular dependencies
  const [handleLoginWithExistingCredentials] = useState(() => handleLoginWithExistingCredentialsRef);
  
  // Combined registration and login flow
  const handleRegisterAndLogin = useCallback(async (): Promise<void> => {
    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
      setError('All registration fields are required');
      AppToaster.show({
        message: 'All registration fields are required',
        intent: Intent.WARNING,
      });
      return;
    }
    
    setIsRegistering(true);
    setError(null);
    
    const registrationData: RegistrationData = {
      first_name,
      last_name,
      email,
      password
    };
    
    // Use promise chaining pattern similar to Register.tsx
    try {
      await register(registrationData as any);
      
      setRegistrationSuccess(true);
      AppToaster.show({
        message: 'Registration successful! Logging in...',
        intent: Intent.SUCCESS,
      });
      
      // Automatically login after successful registration
      setIsLoggingIn(true);
      
      await login({
        crediential: email,
        password
      } as any);
      
    } catch (error: any) {
      // Only handle registration errors here - login errors are handled in the login hook's onError
      if (!registrationSuccess) {
        const { response } = error;
        if (response?.data?.errors) {
          // Use the same error transformation functions as Register.tsx
          const formErrors = transformRegisterErrorsToForm(response.data.errors);
          const toastMessages = transformRegisterToastMessages(response.data.errors);
          
          // Display toast messages
          toastMessages.forEach((toastMessage) => {
            AppToaster.show(toastMessage);
          });
          
          // Check for email exists error specifically
          const emailExistsError = response.data.errors.find(
            (err: { type: string; }) => err.type === 'EMAIL.EXISTS'
          );
          
          if (emailExistsError) {
            setEmailExists(true);
            setError('This email is already registered. You can login with your existing credentials.');
            AppToaster.show({
              message: 'This email is already registered. You can use your existing credentials to login.',
              intent: Intent.WARNING,
            });
            
            // If auto setup is enabled, try to login with the provided credentials after a short delay
            if (autoSetup && email && password) {
              setTimeout(() => {
                if (!loginSuccess) {
                  handleLoginWithExistingCredentialsRef();
                }
              }, 1000);
            }
          }
        } else {
          AppToaster.show({
            message: 'Registration failed. Please check your information.',
            intent: Intent.DANGER,
          });
        }
      }
      setIsRegistering(false);
    }
  }, [first_name, last_name, email, password, register, login, registrationSuccess, autoSetup, loginSuccess, handleLoginWithExistingCredentialsRef]);
  
  // Simple login handler
  const handleLogin = useCallback(async (): Promise<void> => {
    // Validate required fields
    if (!crediential || !password) {
      setError('Email and password are required for login');
      AppToaster.show({
        message: 'Email and password are required for login',
        intent: Intent.WARNING,
      });
      return;
    }
    
    setIsLoggingIn(true);
    setError(null);
    
    try {
      const loginData: LoginData = {
        crediential,
        password
      };
      await login(loginData as any);
    } catch (err) {
      // Login errors are handled in onError callback
    }
  }, [crediential, password, login]);
  
  // Complete auto registration and setup flow
  const handleCompleteSetup = useCallback(async (): Promise<void> => {
    // First register and login
    await handleRegisterAndLogin();
    // Organization setup is triggered after successful login via the onSuccess callback
  }, [handleRegisterAndLogin]);
  
  // Auto-register and login if autoRegister query param is set to true
  useEffect(() => {
    const autoRegister = query.get('autoRegister');
    const autoLogin = query.get('autoLogin');
    
    let isMounted = true;
    
    const initiateAuth = async () => {
      if (autoRegister === 'true' && first_name && last_name && email && password) {
        if (autoSetup && org_name && org_location) {
          await handleCompleteSetup();
        } else {
          await handleRegisterAndLogin();
        }
      }
      
      if (autoLogin === 'true' && crediential && password && !autoRegister) {
        await handleLogin();
      }
    };
    
    // Only run if component is mounted
    if (isMounted) {
      initiateAuth();
    }
    
    // Clean up function
    return () => {
      isMounted = false;
      setIsRegistering(false);
      setIsLoggingIn(false);
      setIsSettingUpOrg(false);
    };
  }, [
    query, 
    autoSetup, 
    first_name, 
    last_name, 
    email, 
    password, 
    org_name, 
    org_location, 
    crediential,
    // ESLint disable next line to safely include handler functions without causing infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
    handleCompleteSetup, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    handleRegisterAndLogin,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    handleLogin
  ]);
  
  // Organization setup handler
  const handleOrgSetup = useCallback((): void => {
    // Validate required fields
    if (!org_name || !org_location) {
      setError('Organization name and location are required');
      AppToaster.show({
        message: 'Organization name and location are required',
        intent: Intent.WARNING,
      });
      return;
    }
    
    // Verify that we have an organization ID in Redux state
    if (!organizationId) {
      setError('Organization ID not available. Attempting to resolve...');
      
      // Check if we've exceeded the maximum retry count for organization ID
      if (orgIdRetryCount >= MAX_ORG_ID_RETRIES) {
        AppToaster.show({
          message: 'Organization ID still not available. Reloading page automatically...',
          intent: Intent.WARNING,
        });
        
        // Reload the page automatically after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }
      
      // Increment the retry counter
      setOrgIdRetryCount(prevCount => prevCount + 1);
      
      // First try refreshing the token to see if that resolves it
      if (orgIdRetryCount === 0) {
        AppToaster.show({
          message: 'Organization ID not available. Refreshing authentication...',
          intent: Intent.PRIMARY,
        });
        
        refreshToken().then(refreshSuccess => {
          if (refreshSuccess) {
            // Try again after token refresh
            setTimeout(() => {
              handleOrgSetup();
            }, 2000);
          } else {
            // If token refresh failed, wait and retry
            AppToaster.show({
              message: 'Waiting for organization data to load...',
              intent: Intent.PRIMARY,
            });
            
            setTimeout(() => {
              handleOrgSetup();
            }, 3000);
          }
        });
      } else {
        // For subsequent retries, just wait longer between attempts
        const waitTime = 3000 + (orgIdRetryCount * 1000);
        
        AppToaster.show({
          message: `Waiting for organization data (attempt ${orgIdRetryCount}/${MAX_ORG_ID_RETRIES})...`,
          intent: Intent.PRIMARY,
        });
        
        setTimeout(() => {
          handleOrgSetup();
        }, waitTime);
      }
      return;
    }
    
    // Reset org ID retry counter once we have an organization ID
    setOrgIdRetryCount(0);
    
    // Check if we've exceeded the maximum org setup retry count
    if (orgSetupRetryCount >= MAX_RETRIES) {
      AppToaster.show({
        message: 'Maximum organization setup retry attempts reached. Please try again manually.',
        intent: Intent.DANGER,
      });
      setError('Maximum organization setup retry attempts reached. Please try again manually.');
      setIsSettingUpOrg(false);
      return;
    }
    
    setIsSettingUpOrg(true);
    setError(null);
    
    // Show a message while setting up
    AppToaster.show({
      message: 'Setting up organization...',
      intent: Intent.PRIMARY,
    });
    
    const orgData: OrganizationSetupData = {
      name: org_name || '',
      location: org_location || '',
      base_currency: org_currency || 'USD',
      language: org_language || 'en',
      fiscal_year: org_fiscal_year || 'january',
      timezone: org_timezone || 'America/New_York'
    };
    
    // Setup the organization using promise chaining
    setupOrganization(orgData as any)
      .then(() => {
        handleOrgSetupSuccess();
        // Reset the retry counter on success
        setOrgSetupRetryCount(0);
      })
      .catch((error: ApiError) => {
        // Check if this is an organization not found error
        const isOrgNotFound = error.response?.data?.errors?.some(
          (err: { type?: string }) => err.type === 'ORGANIZATION.ID.NOT.FOUND'
        );
        
        // Check if this is a session expired error
        const isSessionExpired = error.response?.status === 401;
        
        // Check if this is a tenant already built error
        const isTenantAlreadyBuilt = error.response?.data?.errors?.some(
          (err: { type?: string }) => err.type === 'TENANT_ALREADY_BUILT'
        );
        
        // Check if the tenant is currently being built
        const isTenantBuilding = error.response?.data?.errors?.some(
          (err: { type?: string }) => err.type === 'TENANT_IS_BUILDING'
        );
        
        if (isTenantAlreadyBuilt) {
          // This is not actually an error - the organization is already set up
          setOrgSetupSuccess(true);
          setIsSettingUpOrg(false);
          setError(null);
          
          // Mark the organization setup as completed to bypass the initialization page
          markOrganizationSetupCompleted();
          
          AppToaster.show({
            message: 'Organization is already set up. Redirecting to dashboard...',
            intent: Intent.SUCCESS,
          });
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            history.push('/');
          }, 1500);
          return;
        } else if (isTenantBuilding) {
          // The organization is currently being built, we should poll or wait
          setIsSettingUpOrg(false);
          setError('Your organization is currently being set up. This may take a few moments.');
          
          // Mark the organization setup as completed to bypass the initialization page
          markOrganizationSetupCompleted();
          
          AppToaster.show({
            message: 'Your organization is currently being set up. Please wait...',
            intent: Intent.PRIMARY,
          });
          
          // Try again after a delay
          setTimeout(() => {
            // Attempt to navigate to dashboard directly
            history.push('/');
          }, 3000);
          return;
        } else if (isOrgNotFound) {
          setError('Organization ID not found. Refreshing authentication...');
          AppToaster.show({
            message: 'Organization ID not found. Refreshing authentication...',
            intent: Intent.WARNING,
          });
          
          // Force refresh token and organization ID
          refreshToken().then((refreshSuccess) => {
            if (refreshSuccess) {
              // Add a delay to ensure the new token and organization ID are properly set
              setTimeout(() => {
                // Increment the retry counter
                setOrgSetupRetryCount(prevCount => prevCount + 1);
                handleOrgSetup();
              }, 2000);
            } else {
              setError('Failed to refresh authentication. Please try again manually.');
              setIsSettingUpOrg(false);
            }
          });
        } else if (isSessionExpired) {
          setError('Your session expired during organization setup. Attempting to refresh authentication...');
          // Try to refresh token and then retry the operation
          refreshToken().then((refreshSuccess) => {
            if (refreshSuccess && loginSuccess) {
              // Increment the retry counter before retrying
              setOrgSetupRetryCount(prevCount => prevCount + 1);
              // Add a small delay to ensure token is set
              setTimeout(() => {
                handleOrgSetup();
              }, 1000);
            } else {
              setError('Failed to refresh authentication. Please try again manually.');
              setIsSettingUpOrg(false);
            }
          });
        } else {
          setError(`Organization setup failed: ${error.response?.data?.errors?.[0]?.message || 'Unknown error'}`);
          setIsSettingUpOrg(false);
          
          AppToaster.show({
            message: 'Organization setup failed. Please try again or contact support.',
            intent: Intent.DANGER,
          });
          
          // Reset the retry counter for non-session errors
          setOrgSetupRetryCount(0);
        }
      });
  }, [org_name, org_location, organizationId, orgIdRetryCount, MAX_ORG_ID_RETRIES, orgSetupRetryCount, MAX_RETRIES, refreshToken, setupOrganization, loginSuccess, markOrganizationSetupCompleted, history]);
  
  // Function to reset all processes and states
  const handleCancel = (): void => {
    // Reset all processing states
    setIsRegistering(false);
    setIsLoggingIn(false);
    setIsSettingUpOrg(false);
    setTokenRefreshing(false);
    
    // Reset retry counters
    setRetryCount(0);
    setOrgSetupRetryCount(0);
    
    setError('Process canceled by user.');
    AppToaster.show({
      message: 'Process canceled. You can try again manually.',
      intent: Intent.WARNING,
    });
  };
  
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {error && (
        <div style={{ padding: '10px', backgroundColor: '#FBE2E2', color: '#A82A2A', borderRadius: '4px', marginBottom: '20px' }}>
          {error}
          {(isRegistering || isLoggingIn || isSettingUpOrg || tokenRefreshing) && (
            <Button 
              intent={Intent.DANGER}
              small={true}
              style={{ marginLeft: '10px' }}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      )}
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Auto Authentication & Setup</h2>
        <p>Use the buttons below to register, login, and setup your organization with the provided URL parameters.</p>
      </div>
      
      <Card style={{ marginBottom: '20px' }}>
        <h3>Registration & Login Process</h3>
        
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#F5F8FA', borderRadius: '4px' }}>
          <h4>Login Parameters</h4>
          <div>Email (crediential): {crediential || 'not provided'}</div>
          <div>Password: {password ? '********' : 'not provided'}</div>
          <div style={{ marginTop: '15px' }}>
            <Button 
              intent={Intent.PRIMARY}
              onClick={handleLogin}
              disabled={isLoggingIn || !crediential || !password || loginSuccess}
              style={{ marginRight: '10px' }}
            >
              {isLoggingIn ? <Spinner size={16} /> : loginSuccess ? 'Logged In ✓' : 'Login'}
            </Button>
            
            {emailExists && (
              <Button
                intent={Intent.WARNING}
                onClick={handleLoginWithExistingCredentialsRef}
                disabled={isLoggingIn || !email || !password || loginSuccess}
              >
                {isLoggingIn ? <Spinner size={16} /> : 'Login with Existing Account'}
              </Button>
            )}
          </div>
        </div>
        
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#F5F8FA', borderRadius: '4px' }}>
          <h4>Registration Parameters</h4>
          <div>First Name: {first_name || 'not provided'}</div>
          <div>Last Name: {last_name || 'not provided'}</div>
          <div>Email: {email || 'not provided'}</div>
          <div>Password: {password ? '********' : 'not provided'}</div>
          <div style={{ marginTop: '15px' }}>
            <Button 
              intent={Intent.SUCCESS}
              onClick={handleRegisterAndLogin}
              disabled={isRegistering || isLoggingIn || !first_name || !last_name || !email || !password || loginSuccess}
              style={{ marginRight: '10px' }}
            >
              {isRegistering ? 
                <><Spinner size={16} /> Registering...</> : 
                isLoggingIn ? 
                  <><Spinner size={16} /> Logging in...</> : 
                  loginSuccess ? 
                    'Registered & Logged In ✓' : 
                    'Register & Login'}
            </Button>
          </div>
          
          {emailExists && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#FFE8D9', borderRadius: '4px' }}>
              <p><strong>Note:</strong> This email is already registered. You can use the "Login with Existing Account" button instead.</p>
              {autoSetup && (
                <p><strong>Auto Setup:</strong> We'll attempt to log you in with the provided credentials automatically.</p>
              )}
            </div>
          )}
        </div>
      </Card>
      
      <Card style={{ marginBottom: '20px' }}>
        <h3>Organization Setup Process</h3>
        <p>After registration, you'll need to setup your organization. You can provide these parameters to automate the process.</p>
        
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#F5F8FA', borderRadius: '4px' }}>
          <h4>Organization Parameters</h4>
          <div>Organization Name: {org_name || 'not provided'}</div>
          <div>Business Location: {org_location || 'not provided'}</div>
          
          <Button 
            minimal 
            style={{ marginTop: '10px' }} 
            onClick={() => setShowAdvancedParams(!showAdvancedParams)}
          >
            {showAdvancedParams ? 'Hide' : 'Show'} Advanced Parameters
          </Button>
          
          <Collapse isOpen={showAdvancedParams}>
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
              <div>Base Currency: {org_currency || 'USD (default)'}</div>
              <div>Language: {org_language || 'en (default)'}</div>
              <div>Fiscal Year: {org_fiscal_year || 'january (default)'}</div>
              <div>Timezone: {org_timezone || 'America/New_York (default)'}</div>
            </div>
          </Collapse>
          
          <div style={{ marginTop: '15px' }}>
            <Button 
              intent={Intent.PRIMARY}
              onClick={handleOrgSetup}
              disabled={isSettingUpOrg || !org_name || !org_location || !loginSuccess || orgSetupSuccess}
              style={{ marginRight: '10px' }}
            >
              {isSettingUpOrg ? 
                <><Spinner size={16} /> Setting up organization...</> : 
                orgSetupSuccess ? 
                  'Organization Setup Complete ✓' : 
                  'Setup Organization'}
            </Button>
          </div>
        </div>
        
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#F5F8FA', borderRadius: '4px' }}>
          <h4>Complete Registration & Setup</h4>
          <p>This will perform the entire process automatically: register, login, and set up the organization.</p>
          
          <Button 
            intent={Intent.SUCCESS}
            onClick={handleCompleteSetup}
            disabled={
              isRegistering || 
              isLoggingIn || 
              isSettingUpOrg || 
              orgSetupSuccess ||
              !first_name || 
              !last_name || 
              !email || 
              !password || 
              !org_name || 
              !org_location
            }
            style={{ marginRight: '10px' }}
          >
            {isRegistering ? 
              <><Spinner size={16} /> Registering...</> : 
              isLoggingIn ? 
                <><Spinner size={16} /> Logging in...</> : 
                isSettingUpOrg ?
                  <><Spinner size={16} /> Setting up organization...</> :
                  orgSetupSuccess ? 
                    'Complete Setup Done ✓' : 
                    'Complete Registration & Setup'}
          </Button>
        </div>
      </Card>
      
      <div style={{ marginTop: '30px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <p><strong>Note:</strong> For security reasons, passwords should never be passed in URL parameters. 
        This is for demonstration purposes only.</p>
        <p><strong>Sample URL:</strong> Include <code>autoRegister=true&autoSetup=true</code> for a fully automated process.</p>
        
        <div style={{ marginTop: '15px', borderLeft: '3px solid #ddd', paddingLeft: '10px' }}>
          <p><strong>Valid parameter values:</strong></p>
          <ul>
            <li><strong>org_fiscal_year</strong>: Must be a month name (lowercase): <code>january</code>, <code>february</code>, <code>march</code>, etc.</li>
            <li><strong>org_location</strong>: Must be a valid ISO 3166-1 alpha-2 country code: <code>US</code>, <code>GB</code>, <code>DE</code>, etc.</li>
            <li><strong>org_currency</strong>: Must be a valid ISO 4217 currency code: <code>USD</code>, <code>EUR</code>, <code>GBP</code>, etc.</li>
          </ul>
          
          <p><strong>Example working URL:</strong></p>
          <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px', overflowX: 'auto', fontSize: '0.85em' }}>
            <code>http://localhost:3000/auto_auth?autoRegister=true&autoSetup=true&first_name=John&last_name=Doe&email=johndoe@example.com&password=SecurePass123&org_name=Test%20Company&org_location=US&org_currency=USD&org_fiscal_year=january&org_language=en&org_timezone=America/New_York</code>
          </div>
        </div>
        
        {emailExists && (
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#FFE8D9', borderRadius: '4px' }}>
            <p><strong>Recommendation:</strong> Since the email already exists, try using <code>autoLogin=true</code> instead of <code>autoRegister=true</code>.</p>
            <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px', overflowX: 'auto', fontSize: '0.85em' }}>
              <code>http://localhost:3000/auto_auth?autoLogin=true&crediential={email}&password={password}&autoSetup=true&org_name=Test%20Company&org_location=US&org_currency=USD&org_fiscal_year=january</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Ensure export is using default export for lazy loading to work properly
export default withOrganizationActions(AutoAuthComponent);
