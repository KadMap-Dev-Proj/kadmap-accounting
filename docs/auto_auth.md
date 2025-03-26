# Bigcapital Setup Documentation

## Prerequisites
- Python (latest version)
- Node.js (versions 16.x, 17.x, or 18.x)
- pnpm package manager
- Git
- Docker and Docker Compose

## Step-by-Step Installation Guide

### 1. Install Prerequisites
```bash
# Install Node.js (choose one version: 16, 17, or 18)
# Visit https://nodejs.org and download appropriate version

# Install pnpm
npm install -g pnpm

# Verify installations
node --version
pnpm --version
python --version
```

### 2. Clone and Setup Project
```bash
# Clone the repository
git clone https://github.com/bigcapitalhq/bigcapital.git
cd bigcapital

# Create environment file
cp .env.example .env

# Install dependencies
pnpm install
```

### 3. Setup Docker Containers
```bash
# Start required containers
docker-compose up -d

# Verify containers are running
docker-compose ps
```

You should see containers running for:
- bigcapital-mysql
- bigcapital-redis
- bigcapital-mongo


### create a file "/packages/server/newrelic.js"
add this content (
   'use strict';

   exports.config = {
     app_name: ['Kadmap Accounting'],
     license_key: 'your-license-key-here',
     logging: {
      level: 'info'
   }
}; 
)

### 4. Build and Initialize Backend
```bash
# Build the server
pnpm run build:server

# Run database migrations
node packages/server/build/commands.js system:migrate:latest
```

### 5. Start Development Servers
```bash
# Start backend server
pnpm run dev:server

# In a new terminal, start frontend
pnpm run dev:webapp
```

### 6. Access the Application
- Frontend: http://localhost:4000
- Backend: http://localhost:3000

## Troubleshooting Tips
1. If containers fail to start:
   - Ensure Docker is running
   - Check if ports 3306, 27017, and 6379 are available
2. If dependencies fail to install:
   - Remove `node_modules` directory
   - Run `pnpm install` again
3. Ensure all prerequisite versions are compatible

## Development Notes
- The application uses a monorepo structure
- Frontend and backend can be developed independently
- Docker containers must be running for full functionality.


Note* the login url:
{BASE_URL}/auto_auth?email=user@example.com&password=myPassword&first_name=John&last_name=Doe

---
*Source: [Bigcapital Contributing Guidelines](https://github.com/bigcapitalhq/bigcapital/blob/develop/CONTRIBUTING.md)*