// @ts-nocheck
import React from 'react';
import { ProgressBar, Intent, Button, Spinner, Icon } from '@blueprintjs/core';
import * as R from 'ramda';
import { useHistory } from 'react-router-dom';

import { useJob, useCurrentOrganization } from '@/hooks/query';
import { FormattedMessage as T } from '@/components';

import withOrganizationActions from '@/containers/Organization/withOrganizationActions';
import withCurrentOrganization from '@/containers/Organization/withCurrentOrganization';
import withOrganization from '../Organization/withOrganization';

import '@/style/pages/Setup/Initializing.scss';

/**
 * Setup initializing step form.
 */
function SetupInitializingForm({
  setOrganizationSetupCompleted,
  organization,
  isOrganizationSetupCompleted,
  wizard
}) {
  const { refetch, isSuccess } = useCurrentOrganization({ enabled: false });
  const history = useHistory();

  // Job done state.
  const [isJobDone, setIsJobDone] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);

  const {
    data: { running, queued, failed, completed },
    isFetching: isJobFetching,
  } = useJob(organization?.build_job_id, {
    refetchInterval: 2000,
    enabled: !!organization?.build_job_id,
  });

  // Effect to handle job completion
  React.useEffect(() => {
    if (completed) {
      refetch();
      setIsJobDone(true);
    }
  }, [refetch, completed, setOrganizationSetupCompleted]);

  // Effect to handle successful completion of job and organization setup
  React.useEffect(() => {
    if (isSuccess && isJobDone) {
      setOrganizationSetupCompleted(true);
      setIsJobDone(false);
    }
  }, [setOrganizationSetupCompleted, isJobDone, isSuccess]);

  // Effect to automatically continue to dashboard if setup is already marked as completed
  React.useEffect(() => {
    if (isOrganizationSetupCompleted && !redirecting) {
      setRedirecting(true);
      
      setTimeout(() => {
        // Go to dashboard
        history.push('/');
      }, 1500);
    }
  }, [isOrganizationSetupCompleted, history, redirecting]);

  // If setup is already completed, show a redirecting message
  if (isOrganizationSetupCompleted) {
    return (
      <div className="setup-initializing-form">
        <div className="setup-initializing__content">
          <div className="setup-initializing-form__title" style={{ textAlign: 'center' }}>
            <Spinner intent={Intent.SUCCESS} size={50} style={{ marginBottom: '20px' }} />
            <h1 style={{ color: '#0D8050' }}>
              <T id={'setup.initializing.setup_complete'} />
            </h1>
            <p className="paragraph" style={{ fontSize: '16px', color: '#137547' }}>
              <T id={'setup.initializing.redirecting_to_dashboard'} />
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-initializing-form">
      {failed ? (
        <SetupInitializingFailed 
          setOrganizationSetupCompleted={setOrganizationSetupCompleted}
        />
      ) : running || queued || isJobFetching ? (
        <SetupInitializingRunning 
          setOrganizationSetupCompleted={setOrganizationSetupCompleted}
        />
      ) : completed ? (
        <SetupInitializingCompleted />
      ) : (
        <SetupInitializingFailed 
          setOrganizationSetupCompleted={setOrganizationSetupCompleted}
        />
      )}
    </div>
  );
}

export default R.compose(
  withOrganizationActions,
  withCurrentOrganization(({ organizationTenantId }) => ({
    organizationId: organizationTenantId,
  })),
  withOrganization(({ 
    organization,
    isOrganizationSetupCompleted  
  }) => ({ 
    organization,
    isOrganizationSetupCompleted
  })),
)(SetupInitializingForm);

/**
 * State initializing failed state.
 */
function SetupInitializingFailed({ setOrganizationSetupCompleted }) {
  const history = useHistory();

  const handleSkipInitialization = () => {
    try {
      // Mark the organization setup as completed
      setOrganizationSetupCompleted(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        history.push('/');
      }, 1500);
    } catch (err) {
      console.error('Failed to mark organization setup as completed:', err);
    }
  };

  return (
    <div className="setup-initializing__content">
      <div className="setup-initializing-form__title" style={{ textAlign: 'center' }}>
        <Icon icon="error" size={40} intent={Intent.DANGER} style={{ marginBottom: '10px' }} />
        <h1 style={{ color: '#A82A2A' }}>
          <T id={'setup.initializing.something_went_wrong'} />
        </h1>
        <p className="paragraph" style={{ fontSize: '16px', color: '#A82A2A', marginBottom: '20px' }}>
          We encountered an issue during initialization. You can try refreshing the page or skip to the dashboard.
        </p>
        <div style={{ marginTop: '20px' }}>
          <Button
            intent={Intent.PRIMARY}
            onClick={handleSkipInitialization}
            large={true}
            icon="arrow-right"
            style={{ borderRadius: '4px' }}
          >
            Skip to Dashboard
          </Button>
          <Button
            intent={Intent.NONE}
            onClick={() => window.location.reload()}
            style={{ marginLeft: '10px', borderRadius: '4px' }}
          >
            <Icon icon="refresh" /> Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Setup initializing running state.
 */
function SetupInitializingRunning({ setOrganizationSetupCompleted }) {
  const history = useHistory();
  const [progress, setProgress] = React.useState(0);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (progress < 95) {
        setProgress(prevProgress => {
          const newProgress = prevProgress + Math.floor(Math.random() * 10);
          return Math.min(newProgress, 95);
        });
      } else {
        clearInterval(interval);
      }
    }, 1500);
    
    return () => clearInterval(interval);
  }, [progress]);

  const handleSkipInitialization = () => {
    try {
      // Mark the organization setup as completed
      setOrganizationSetupCompleted(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        history.push('/');
      }, 1500);
    } catch (err) {
      console.error('Failed to mark organization setup as completed:', err);
    }
  };

  return (
    <div className="setup-initializing__content">
      <div style={{ width: '80%', margin: '0 auto', marginBottom: '30px' }}>
        <ProgressBar 
          intent={Intent.PRIMARY} 
          value={progress / 100} 
          animate={true}
          stripes={true}
          style={{ height: '8px', borderRadius: '4px' }}
        />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '5px', 
          fontSize: '14px', 
          color: '#5C7080' 
        }}>
          <span>Setting up...</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* <div className="setup-initializing-form__title" style={{ textAlign: 'center' }}>
        <p className="paragraph" style={{ fontSize: '16px', color: '#394B59', margin: '15px 0' }}>
          Please wait...
        </p>
      </div> */}
    </div>
  );
}

/**
 * Setup initializing completed state.
 */
function SetupInitializingCompleted() {
  const history = useHistory();
  
  React.useEffect(() => {
    // Automatically redirect after a short delay
    const timer = setTimeout(() => {
      history.push('/');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [history]);
  
  return (
    <div className="setup-initializing__content">
      <div className="setup-initializing-form__title" style={{ textAlign: 'center' }}>
        <Icon icon="tick-circle" intent={Intent.SUCCESS} size={50} style={{ marginBottom: '20px' }} />
        <h1 style={{ color: '#0D8050' }}>
          <T id={'setup.initializing.waiting_to_redirect'} />
        </h1>
        <p className="paragraph" style={{ fontSize: '16px', color: '#137547', marginBottom: '20px' }}>
          <T id={'setup.initializing.refresh_the_page_if_redirect_not_worked'} />
        </p>
        <Spinner intent={Intent.SUCCESS} size={24} />
      </div>
    </div>
  );
}
