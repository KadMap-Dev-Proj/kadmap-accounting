// @ts-nocheck
import axios from 'axios';
import { store } from '@/store/createStore';
import { setGlobalErrors } from '@/store/globalErrors/globalErrors.actions';
import { getCookie, setCookie } from '@/utils';

const http = axios.create();

// Track if we have an authentication refresh in progress
let isRefreshingToken = false;
let failedQueue = [];

// Process queued requests
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

http.interceptors.request.use((request) => {
  const state = store.getState();
  const { token, organization } = state.authentication;
  const locale = 'en';

  if (token) {
    request.headers.common['x-access-token'] = token;
  }
  if (organization) {
    request.headers.common['organization-id'] = organization;
  }
  if (locale) {
    request.headers.common['Accept-Language'] = locale;
  }
  request.headers.common['Accept-Language'] = 'ar';

  return request;
}, (error) => {
  return Promise.reject(error);
});

http.interceptors.response.use((response) => response, (error) => {
  const originalRequest = error.config;
  const { status, data } = error.response || {};

  // Handle 401 responses (authentication issues)
  if (status === 401 && !originalRequest._retry) {
    // If we're not already refreshing, try to refresh
    if (!isRefreshingToken) {
      isRefreshingToken = true;
      originalRequest._retry = true;
      
      // Attempt to refresh from cookie or use cached credentials
      // We won't implement the actual refresh logic here since it might require
      // more complex state management, but we're setting up the structure
      
      // For now, we'll just mark the session as expired
      store.dispatch(setGlobalErrors({ session_expired: true }));
      
      // Notify that we completed our refresh attempt
      isRefreshingToken = false;
    }
    
    // Add the request to the queue
    const retryOriginalRequest = new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
    
    return retryOriginalRequest;
  }
  
  // Handle server errors
  if (status >= 500) {
    store.dispatch(setGlobalErrors({ something_wrong: true }));
  }
  
  return Promise.reject(error);
});

export default http;