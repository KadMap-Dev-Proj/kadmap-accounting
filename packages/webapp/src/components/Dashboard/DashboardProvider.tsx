// @ts-nocheck
// import React from 'react';
// import { DashboardAbilityProvider, SplashScreen } from '../../components';
// import { useDashboardMetaBoot } from './DashboardBoot';

// /**
//  * Dashboard provider.
//  */
// export default function DashboardProvider({ children }) {
//   const { isLoading } = useDashboardMetaBoot();

//   // Avoid display any dashboard component before complete booting.
//   if (isLoading) {
//     return ( <SplashScreen />
//     );
    
//   }
//   return <DashboardAbilityProvider>{children}</DashboardAbilityProvider>;
// }


// @ts-nocheck
import React from 'react';
import { DashboardAbilityProvider, SplashScreen } from '../../components';
import { useDashboardMetaBoot } from './DashboardBoot';
import BigcapitalLoading from './BigcapitalLoading';

/**
 * Dashboard provider.
 */
export default function DashboardProvider({ children }) {
  const { isLoading } = useDashboardMetaBoot();

  return (
    <>
      {isLoading ? <BigcapitalLoading />  : (
        <DashboardAbilityProvider>
          {children}
        </DashboardAbilityProvider>
      )}
    </>
  );
}