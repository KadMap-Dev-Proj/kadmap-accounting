// // @ts-nocheck
// import React from 'react';
// import classNames from 'classnames';
// import { Icon } from '@/components';

// import '@/style/components/BigcapitalLoading.scss';

// /**
//  * Bigcapital logo loading.
//  */
// export default function BigcapitalLoading({ className }) {
//   return (
//     <div className={classNames('bigcapital-loading', className)}>
//       <div class="center">
//         SOMETHING IS LOADING
//         {/* <Icon icon="bigcapital" height={37} width={228} /> */}
//       </div>
//     </div>
//   );
// }



// @ts-nocheck
import React from 'react';
import classNames from 'classnames';

const fadeInOutKeyframes = `
  @keyframes fadeInOut {
    0%, 100% { opacity: 0; transform: translateY(5px); }
    50% { opacity: 1; transform: translateY(0); }
  }
`;

const loadingBarKeyframes = `
  @keyframes loadingBar {
    0% { left: -40%; }
    100% { left: 100%; }
  }
`;

export default function BigcapitalLoading({ className }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#1c2448',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <style>
        {fadeInOutKeyframes}
        {loadingBarKeyframes}
      </style>
      
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 600,
            color: 'white',
            letterSpacing: '2px',
          }}>
            {['P','L','E','A','S','E',' ','W','A','I','T','.','.','.'].map((letter, index) => (
              <span key={index} style={{
                display: 'inline-block',
                animation: 'fadeInOut 1.5s infinite',
                animationDelay: `${index * 0.1}s`,
                opacity: 0,
              }}>
                {letter}
              </span>
            ))}
          </div>

          <div style={{
            width: '200px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '40%',
              background: 'white',
              borderRadius: '10px',
              animation: 'loadingBar 1.5s infinite',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}