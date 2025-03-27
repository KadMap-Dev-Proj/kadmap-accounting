// @ts-nocheck
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import SetupRightSection from './SetupRightSection';
import SetupLeftSection from './SetupLeftSection';
import EnsureOrganizationIsNotReady from '@/components/Guards/EnsureOrganizationIsNotReady';
import withOrganization from '@/containers/Organization/withOrganization';
import { compose } from '@/utils';
import { AppToaster } from '@/components';
import { Intent } from '@blueprintjs/core';

import '@/style/pages/Setup/SetupPage.scss';

function WizardSetupPage({ isOrganizationSetupCompleted }) {
  const history = useHistory();

  // Redirect to dashboard if organization setup is already completed
  useEffect(() => {
    if (isOrganizationSetupCompleted) {
      AppToaster.show({
        message: 'Organization setup already completed. Redirecting to dashboard...',
        intent: Intent.SUCCESS,
      });
      
      setTimeout(() => {
        history.push('/');
      }, 1000);
    }
  }, [isOrganizationSetupCompleted, history]);

  return (
    <EnsureOrganizationIsNotReady>
      <div className="setup-page">
        <SetupLeftSection />
        <SetupRightSection />
      </div>
    </EnsureOrganizationIsNotReady>
  );
}

export default compose(
  withOrganization(({ isOrganizationSetupCompleted }) => ({ 
    isOrganizationSetupCompleted 
  }))
)(WizardSetupPage);
