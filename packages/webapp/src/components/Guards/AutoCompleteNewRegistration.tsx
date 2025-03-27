// @ts-nocheck
import React, { useEffect } from 'react';
import { compose } from '@/utils';
import withOrganization from '@/containers/Organization/withOrganization';
import withOrganizationActions from '@/containers/Organization/withOrganizationActions';
import { useAuthOrganizationId } from '@/hooks/state';

/**
 * Auto-completes the organization setup for newly registered users by checking 
 * if the user has an organization ID but setup is not yet marked as completed.
 */
function AutoCompleteNewRegistration({
  // #ownProps
  children,
  
  // #withOrganization
  isOrganizationReady,
  isOrganizationSetupCompleted,
  
  // #withOrganizationActions
  setOrganizationSetupCompleted,
}) {
  // Get organization ID from auth state
  const organizationId = useAuthOrganizationId();
  
  // Check if this is a newly registered user
  useEffect(() => {
    // If user has an organization ID, the organization is ready but setup is not marked as completed
    if (organizationId && isOrganizationReady && !isOrganizationSetupCompleted) {
      // This is a newly registered user, mark organization setup as completed
      try {
        setOrganizationSetupCompleted(true);
        console.log('Auto-completed organization setup for new user');
      } catch (err) {
        console.error('Failed to mark organization setup as completed:', err);
      }
    }
  }, [organizationId, isOrganizationReady, isOrganizationSetupCompleted, setOrganizationSetupCompleted]);

  return <>{children}</>;
}

export default compose(
  withOrganization(({
    isOrganizationReady,
    isOrganizationSetupCompleted
  }) => ({
    isOrganizationReady,
    isOrganizationSetupCompleted
  })),
  withOrganizationActions
)(AutoCompleteNewRegistration); 