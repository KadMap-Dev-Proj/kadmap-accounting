# Automatic Authentication and Registration for KadMap Accounting

This document provides information about KadMap Accounting's automatic authentication and registration features that allow for simplified user login and registration processes without manual intervention.

## Table of Contents
- [Overview](#overview)
- [Auto Authentication](#auto-authentication)
- [Usage and Integration](#usage-and-integration)
- [Security Considerations](#security-considerations)
- [API Reference](#api-reference)

## Overview
KadMap Accounting offers a comprehensive solution for automating user authentication and onboarding:

- **Auto Authentication**: Enables automatic user login and registration with specified attributes, including organization setup

This feature is particularly useful for:

- Integration with external systems
- Onboarding new users through customized workflows
- Creating seamless sign-up and authentication experiences
- Developing custom applications that interact with KadMap Accounting

## Auto Authentication
The Auto Authentication feature enables automatic user authentication or registration based on provided information, first attempting to log in with the provided credentials and only creating a new account if the login fails. It can also set up an organization automatically.

### Endpoints
- **UI Endpoint**: `/auto_auth` - Provides a loading screen while login/registration is processed
<!-- - **API Endpoint**: `/api/auth/register` - Processes the actual registration request
- **API Endpoint**: `/api/auth/login` - Processes authentication requests -->

### How It Works
1. The user is directed to the `/auto_auth` URL with appropriate user information in query parameters
2. The auto authentication component executes and first attempts to authenticate with the provided email and password
3. If authentication is successful, the user is logged in and redirected to the dashboard or specified redirect path
4. If authentication fails (user doesn't exist or credentials are invalid), the script proceeds with registration:
   - Registration data is gathered from URL parameters
   - A registration request is processed
   - The server creates the user and returns a success response with user details
   - If specified, the system also creates and sets up an organization for the user
   - The client-side script then logs in with the credentials used for registration
   - After successful login, the user is redirected to the dashboard or a specified redirect path
5. If registration fails, error information is provided

### Login Parameters
The following parameters can be provided in the URL for authentication:

| Parameter | Description | Example |
|-----------|-------------|---------|
| email     | User's email address | email=admin@example.com |
| password  | User's password | password=SecurePass123 |

If authentication fails, registration will be attempted.

### Registration Parameters
The following parameters can be provided in the URL for registration:

| Parameter | Description | Example |
|-----------|-------------|---------|
| autoRegister | Enable automatic registration | autoRegister=true |
| first_name | User's first name | first_name=John |
| last_name | User's last name | last_name=Doe |
| email | User's email address | email=johndoe@example.com |
| password | User's password | password=SecurePass123 |
| autoSetup | Enable automatic organization setup | autoSetup=true |
| org_name | Organization name | org_name=Test%20Company |
| org_location | Organization location | org_location=US |
| org_currency | Organization currency | org_currency=USD |
| org_fiscal_year | Organization fiscal year start | org_fiscal_year=january |
| org_language | Organization language | org_language=en |
| org_timezone | Organization timezone | org_timezone=America/New_York |

### Response Format
Successful registration typically returns a JSON response with user details and authentication tokens:

```json
{
  "success": true,
  "message": "Your account has been activated. You can now log in.",
  "user": {
    "id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "johndoe@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Usage and Integration
### Auto Authentication URL Example
```
http://localhost:4000/auto_auth?autoRegister=true&autoSetup=true&first_name=John&last_name=Doe&email=johndoe@example.com&password=SecurePass123&org_name=Test%20Company&org_location=US&org_currency=USD&org_fiscal_year=january&org_language=en&org_timezone=America/New_York
```

### JavaScript Integration
For client-side integration, you can use the AutoAuth component provided in the KadMap Accounting application:

```jsx
import { AutoAuth } from '@/components';

<AutoAuth 
  autoRegister={true}
  autoSetup={true}
  credentials={{
    email: 'johndoe@example.com',
    password: 'SecurePass123'
  }}
  userData={{
    first_name: 'John',
    last_name: 'Doe',
     email: 'johndoe@example.com',
    password: 'SecurePass123'
  }}
  orgData={{
    name: 'Test Company',
    location: 'US',
    currency: 'USD',
    fiscal_year: 'january',
    language: 'en',
    timezone: 'America/New_York'
  }}
/>
```

### Server-Side Integration
For server-side integration, you can make direct API requests to the authentication endpoints:

```
POST /api/auth/register
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "johndoe@example.com",
  "password": "SecurePass123"
}
```

## Security Considerations
- Auto registration should only be enabled in controlled environments where you trust the registration sources
- Ensure that auto-registration requests originate from trusted sources
- Consider implementing additional verification mechanisms for registrations
- Use HTTPS to protect sensitive data during the registration process
- Be aware that allowing auto-registration could potentially enable abuse if not properly secured

## API Reference
### Auto Authentication Component
The AutoAuth component accepts the following props:

- `autoRegister`: Boolean to enable automatic registration
- `autoSetup`: Boolean to enable automatic organization setup
- `credentials`: Object containing email and password
- `userData`: Object containing user details (first_name, last_name)
- `orgData`: Object containing organization setup details

### Valid Organization Fiscal Year Values
When setting up an organization with the `org_fiscal_year` parameter, the following values are valid:

- Month names (lowercase): january, february, march, april, may, june, july, august, september, october, november, december

### Configuration
Auto-registration is enabled by default in KadMap Accounting development environments. For production:

- Configure proper authentication settings in your environment
- Consider implementing rate limiting to prevent abuse
- Ensure proper error handling for registration failures
