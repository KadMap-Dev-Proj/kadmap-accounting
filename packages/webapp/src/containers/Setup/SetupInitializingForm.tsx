// @ts-nocheck
import React from 'react';
import { ProgressBar, Intent, Button } from '@blueprintjs/core';
import * as R from 'ramda';
import { useHistory } from 'react-router-dom';

import { useJob, useCurrentOrganization } from '@/hooks/query';
import { FormattedMessage as T, AppToaster } from '@/components';

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
      AppToaster.show({
        message: 'Organization setup already completed. Redirecting to dashboard...',
        intent: Intent.SUCCESS,
      });
      
      setTimeout(() => {
        // Go to dashboard
        history.push('/');
      }, 1000);
    }
  }, [isOrganizationSetupCompleted, history, redirecting]);

  // If setup is already completed, show a redirecting message
  if (isOrganizationSetupCompleted) {
    return (
      <div className="setup-initializing-form">
        <div className="setup-initializing__content">
          <div className="setup-initializing-form__title">
            <h1>
              <T id={'setup.initializing.setup_complete'} />
            </h1>
            <p className="paragraph">
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
        <SetupInitializingFailed setOrganizationSetupCompleted={setOrganizationSetupCompleted} />
      ) : running || queued || isJobFetching ? (
        <SetupInitializingRunning setOrganizationSetupCompleted={setOrganizationSetupCompleted} />
      ) : completed ? (
        <SetupInitializingCompleted />
      ) : (
        <SetupInitializingFailed setOrganizationSetupCompleted={setOrganizationSetupCompleted} />
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
      
      AppToaster.show({
        message: 'Skipping initialization and redirecting to dashboard...',
        intent: Intent.SUCCESS,
      });
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        history.push('/');
      }, 1000);
    } catch (err) {
      console.error('Failed to mark organization setup as completed:', err);
      
      AppToaster.show({
        message: 'Failed to skip initialization. Please try again.',
        intent: Intent.DANGER,
      });
    }
  };

  return (
    <div className="setup-initializing__content">
      <div className="setup-initializing-form__title">
        <h1>
          <T id={'setup.initializing.something_went_wrong'} />
        </h1>
        <p className="paragraph">
          <T id={'setup.initializing.please_refresh_the_page'} />
        </p>
        <div style={{ marginTop: '20px' }}>
          <Button
            intent={Intent.PRIMARY}
            onClick={handleSkipInitialization}
          >
            Skip Initialization and Go To Dashboard
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

  const handleSkipInitialization = () => {
    try {
      // Mark the organization setup as completed
      setOrganizationSetupCompleted(true);
      
      AppToaster.show({
        message: 'Skipping initialization and redirecting to dashboard...',
        intent: Intent.SUCCESS,
      });
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        history.push('/');
      }, 1000);
    } catch (err) {
      console.error('Failed to mark organization setup as completed:', err);
      
      AppToaster.show({
        message: 'Failed to skip initialization. Please try again.',
        intent: Intent.DANGER,
      });
    }
  };

  return (
    <div className="setup-initializing__content">
      <ProgressBar intent={Intent.PRIMARY} value={null} />

      <div className="setup-initializing-form__title">
        <h1>
          <T id={'setup.initializing.title'} />
        </h1>
        <p className="paragraph">
          <T id={'setup.initializing.description'} />
        </p>
        <div style={{ marginTop: '20px' }}>
          <Button
            intent={Intent.PRIMARY}
            onClick={handleSkipInitialization}
          >
            Skip Initialization and Go To Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Setup initializing completed state.
 */
function SetupInitializingCompleted() {
  return (
    <div class="setup-initializing__content">
      <div className={'setup-initializing-form__title'}>
        <h1>
          <T id={'setup.initializing.waiting_to_redirect'} />
        </h1>
        <p class="paragraph">
          <T
            id={'setup.initializing.refresh_the_page_if_redirect_not_worked'}
          />
        </p>
      </div>
    </div>
  );
}
