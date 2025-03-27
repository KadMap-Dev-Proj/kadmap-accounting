import { useLocation, useHistory } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import { Intent, Button, Spinner, Card, Collapse, Elevation } from '@blueprintjs/core';
// import { useAuthRegister, useAuthLogin, useOrganizationSetup } from '@/hooks/query';
import { FormattedMessage as T } from '@/components';
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
  
  // Add state for status message and intent
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
  const [messageIntent, setMessageIntent] = useState<Intent>(Intent.PRIMARY);
  
  // Function to mark the organization setup as completed
  const markOrganizationSetupCompleted = useCallback((): void => {
    try {
      // Call the HOC-provided function
      setOrganizationSetupCompleted(true);
    } catch (err) {
      console.error('Failed to mark organization setup as completed:', err);
    }
  }, [setOrganizationSetupCompleted]);
  
  // Helper function to show status message
  const showStatus = (message: string, intent: Intent = Intent.PRIMARY) => {
    // For PRIMARY intent, always just show "Please wait" instead of detailed steps
    if (intent === Intent.PRIMARY) {
      setStatusMessage("Please wait");
    } else {
      // For success or error states, still show meaningful messages
      setStatusMessage(message);
    }
    setMessageIntent(intent);
  };
  
  const handleOrgSetupSuccess = useCallback((): void => {
    setOrgSetupSuccess(true);
    setIsSettingUpOrg(false);
    
    // Mark the organization setup as completed to bypass the initialization page
    markOrganizationSetupCompleted();
    
    // Replace toast with status message
    showStatus('Organization setup completed! Redirecting to dashboard...', Intent.SUCCESS);
    
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
        // Replace toast with status message
        showStatus(err.message || 'An error occurred during organization setup', Intent.DANGER);
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
      
      // Replace toast with status message
      showStatus('Login successful!', Intent.SUCCESS);
      
      // Reset organization-related retry counters after successful login
      setOrgSetupRetryCount(0);
      setOrgIdRetryCount(0);
      
      // If we have organization parameters, proceed with setup
      if (autoSetup && org_name && org_location) {
        // Use a longer delay to ensure the token and organization ID are properly set in Redux state
        showStatus('Preparing organization setup...', Intent.PRIMARY);
        
        // Ensure the organization ID is loaded in Redux state before proceeding
        // Use a longer delay to give Redux state time to update with the new organization ID
        setTimeout(() => {
          if (res.data?.tenant?.organization_id) {
            handleOrgSetup();
          } else {
            handleOrgSetup();
          }
        }, 2500);
      } else {
        // If no organization setup is needed, redirect to setup page
        showStatus('Redirecting to setup wizard...', Intent.PRIMARY);
        
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
          // Replace toast with status message
          showStatus(err.message || 'An error occurred during login', Intent.DANGER);
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
      showStatus('Maximum authentication retry attempts reached. Please try again manually.', Intent.DANGER);
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
      
      showStatus(`Refreshing authentication (attempt ${retryCount + 1}/${MAX_RETRIES})...`, Intent.PRIMARY);
      
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
      showStatus('This email is already registered. Attempting to login with provided credentials...', Intent.PRIMARY);
      
      await login({
        crediential: email,
        password
      } as any);
    } catch (err) {
      // Login errors are handled in onError callback
      // Make sure we're not stuck in a loading state
      setIsLoggingIn(false);
      
      // Show a specific message for login failure after email exists
      showStatus('Login failed. The provided password may not match the existing account.', Intent.WARNING);
    }
  }, [email, password, isLoggingIn, login]);
  
  // Store the function in a ref to break circular dependencies
  const [handleLoginWithExistingCredentials] = useState(() => handleLoginWithExistingCredentialsRef);
  
  // Combined registration and login flow
  const handleRegisterAndLogin = useCallback(async (): Promise<void> => {
    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
      setError('All registration fields are required');
      showStatus('All registration fields are required', Intent.WARNING);
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
      showStatus('Registration successful! Logging in...', Intent.SUCCESS);
      
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
          
          // Display status messages instead of toast messages
          // toastMessages.forEach((toastMessage) => {
          //   showStatus(toastMessage.message, toastMessage.intent);
          // });
          
          // Check for email exists error specifically
          const emailExistsError = response.data.errors.find(
            (err: { type: string; }) => err.type === 'EMAIL.EXISTS'
          );
          
          if (emailExistsError) {
            setEmailExists(true);
            setError('This email is already registered. You can login with your existing credentials.');
            // showStatus('This email is already registered. You can use your existing credentials to login.', Intent.WARNING);
            
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
          showStatus('Registration failed. Please check your information.', Intent.DANGER);
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
      showStatus('Email and password are required for login', Intent.WARNING);
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
    
    // Set initial message based on parameters
    if (autoRegister === 'true') {
      showStatus('Starting auto-registration process...', Intent.PRIMARY);
    } else if (autoLogin === 'true') {
      showStatus('Starting auto-login process...', Intent.PRIMARY);
    } else {
      showStatus('Ready for authentication...', Intent.PRIMARY);
    }
    
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
      // showStatus('Organization name and location are required', Intent.WARNING);
      return;
    }
    
    // Verify that we have an organization ID in Redux state
    if (!organizationId) {
      setError('Organization ID not available. Attempting to resolve...');
      
      // Check if we've exceeded the maximum retry count for organization ID
      if (orgIdRetryCount >= MAX_ORG_ID_RETRIES) {
        // showStatus('Organization ID still not available. Reloading page automatically...', Intent.WARNING);
        
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
        // showStatus('Organization ID not available. Refreshing authentication...', Intent.PRIMARY);
        
        refreshToken().then(refreshSuccess => {
          if (refreshSuccess) {
            // Try again after token refresh
            setTimeout(() => {
              handleOrgSetup();
            }, 2000);
          } else {
            // If token refresh failed, wait and retry
            showStatus('Waiting for organization data to load...', Intent.PRIMARY);
            
            setTimeout(() => {
              handleOrgSetup();
            }, 3000);
          }
        });
      } else {
        // For subsequent retries, just wait longer between attempts
        const waitTime = 3000 + (orgIdRetryCount * 1000);
        
        showStatus(`Waiting for organization data (attempt ${orgIdRetryCount}/${MAX_ORG_ID_RETRIES})...`, Intent.PRIMARY);
        
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
      showStatus('Maximum organization setup retry attempts reached. Please try again manually.', Intent.DANGER);
      setError('Maximum organization setup retry attempts reached. Please try again manually.');
      setIsSettingUpOrg(false);
      return;
    }
    
    setIsSettingUpOrg(true);
    setError(null);
    
    // Show a message while setting up
    showStatus('Setting up organization...', Intent.PRIMARY);
    
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
          
          // showStatus('Organization is already set up. Redirecting to dashboard...', Intent.SUCCESS);
          
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
          
          
          // Try again after a delay
          setTimeout(() => {
            // Attempt to navigate to dashboard directly
            history.push('/');
          }, 3000);
          return;
        } else if (isOrgNotFound) {
          setError('Organization ID not found. Refreshing authentication...')
          
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
    showStatus('Process canceled. You can try again manually.', Intent.WARNING);
  };
  
  return (
    <div style={{ 
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)',
      transition: 'background-color 0.5s ease'
    }}>
      <Card 
        elevation={Elevation.FOUR} 
        style={{ 
          width: '420px',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '12px',
          boxShadow: messageIntent === Intent.SUCCESS ? 
            '0 10px 25px rgba(13, 128, 80, 0.2), 0 5px 10px rgba(13, 128, 80, 0.1)' : 
            messageIntent === Intent.DANGER ? 
            '0 10px 25px rgba(168, 42, 42, 0.2), 0 5px 10px rgba(168, 42, 42, 0.1)' : 
            '0 10px 25px rgba(41, 101, 204, 0.2), 0 5px 10px rgba(41, 101, 204, 0.1)',
          transform: 'translateY(0px)',
          transition: 'all 0.3s ease',
          border: 'none'
        }}
      >
        {/* Top colored section with subtle gradient based on intent */}
        <div style={{
          padding: '30px 0',
          background: messageIntent === Intent.SUCCESS ? 
            'linear-gradient(135deg, #0F9960 0%, #0D8050 100%)' : 
            messageIntent === Intent.DANGER ? 
            'linear-gradient(135deg, #DB3737 0%, #A82A2A 100%)' : 
            'linear-gradient(135deg, #4580E6 0%, #2965CC 100%)',
        }}>
          <div style={{ 
            width: '90px',
            height: '90px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
          }}>
            <Spinner 
              intent={messageIntent} 
              size={60}
              className="custom-spinner"
            />
          </div>
        </div>
        
        {/* Lower content section - simplified */}
        <div style={{ padding: '25px 30px 30px', backgroundColor: '#ffffff', textAlign: 'center' }}>
          <div style={{ 
            fontWeight: '600',
            fontSize: '24px',
            marginBottom: '12px',
            color: messageIntent === Intent.SUCCESS ? '#0D8050' : 
                  messageIntent === Intent.DANGER ? '#A82A2A' : '#2965CC',
            letterSpacing: '-0.01em',
            lineHeight: '1.3'
          }}>
            {statusMessage}
          </div>
          
          {/* Show simplified description text only for PRIMARY intent */}
          {messageIntent === Intent.PRIMARY && (
            <div style={{
              fontSize: '16px',
              lineHeight: '1.5',
              color: 'rgba(41, 101, 204, 0.8)',
            }}>
              Setting up your account
            </div>
          )}
          
          {/* Show success message for SUCCESS intent */}
          {messageIntent === Intent.SUCCESS && (
            <div style={{
              fontSize: '16px',
              lineHeight: '1.5',
              color: 'rgba(13, 128, 80, 0.8)',
            }}>
              Setup completed successfully
            </div>
          )}
          
          {/* Show error message for DANGER intent */}
          {messageIntent === Intent.DANGER && (
            <div style={{
              fontSize: '16px',
              lineHeight: '1.5',
              color: 'rgba(168, 42, 42, 0.8)',
            }}>
              An error occurred
            </div>
          )}
          
          {/* Animated progress indicator for PRIMARY intent */}
          {messageIntent === Intent.PRIMARY && (
            <div style={{ marginTop: '25px', height: '4px', backgroundColor: '#E7EDF3', borderRadius: '2px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  backgroundColor: '#4580E6',
                  width: '30%',
                  borderRadius: '2px',
                  animation: 'indeterminate-progress 1.5s ease-in-out infinite',
                }}
              />
              <style>{`
                @keyframes indeterminate-progress {
                  0% { width: 30%; transform: translateX(-100%); }
                  100% { width: 30%; transform: translateX(400%); }
                }
              `}</style>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Ensure export is using default export for lazy loading to work properly
export default withOrganizationActions(AutoAuthComponent);
