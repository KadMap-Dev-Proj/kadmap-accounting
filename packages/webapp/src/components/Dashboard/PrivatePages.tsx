// @ts-nocheck
import React, { lazy } from 'react';
import { Switch, Route } from 'react-router';

import Dashboard from '@/components/Dashboard/Dashboard';

import { PrivatePagesProvider } from './PrivatePagesProvider';
import EnsureOrganizationIsReady from '../Guards/EnsureOrganizationIsReady';
import { EnsureAuthenticated } from '../Guards/EnsureAuthenticated';
import { EnsureUserEmailVerified } from '../Guards/EnsureUserEmailVerified';
import AutoCompleteNewRegistration from '../Guards/AutoCompleteNewRegistration';

import '@/style/pages/Dashboard/Dashboard.scss';

const SetupWizardPage = lazy(
  () => import('@/containers/Setup/WizardSetupPage'),
);
/**
 * Dashboard inner private pages.
 */
export default function DashboardPrivatePages() {
  return (
    <EnsureAuthenticated>
      <EnsureUserEmailVerified>
        <AutoCompleteNewRegistration>
          <PrivatePagesProvider>
            <Switch>
              <Route path={'/setup'} children={<SetupWizardPage />} />
              <Route path="/">
                <EnsureOrganizationIsReady>
                  <Dashboard />
                </EnsureOrganizationIsReady>
              </Route>
            </Switch>
          </PrivatePagesProvider>
        </AutoCompleteNewRegistration>
      </EnsureUserEmailVerified>
    </EnsureAuthenticated>
  );
}
