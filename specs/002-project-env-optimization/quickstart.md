# Quick Start Guide: Project Environment Optimization

**Date**: 2024-10-23  
**Feature**: Project Environment Optimization  
**Purpose**: Get developers up and running quickly with the optimized development environment

## Prerequisites

### System Requirements
- **Node.js**: 18.0.0 or higher (LTS recommended)
- **npm**: 9.0.0 or higher
- **Git**: 2.30.0 or higher
- **Operating System**: macOS, Linux, or Windows

### Development Tools
- **VS Code**: Latest version with recommended extensions
- **Terminal**: Any modern terminal application
- **Browser**: Chrome, Firefox, Safari, or Edge (latest version)

## Quick Setup (5 minutes)

### 1. Clone and Navigate
```bash
# Clone the repository (if not already done)
git clone https://github.com/openaero/openaero.web.git
cd openaero.web

# Switch to the optimization branch
git checkout 002-project-env-optimization
```

### 2. Install Dependencies
```bash
# Install all dependencies
npm install

# Verify installation
npm run check-dependencies
```

### 3. Environment Setup
```bash
# Copy environment template
cp env.example .env.local

# Edit environment variables (optional)
# nano .env.local
```

### 4. Start Development Server
```bash
# Method 1: Use the startup script (recommended)
./start-dev.sh

# Method 2: Use npm scripts
npm run dev:3000

# Method 3: Use VS Code tasks
# Press Ctrl+Shift+P, search for "Start Development Server"
```

### 5. Verify Setup
```bash
# Check server status
curl -I http://localhost:3000

# Run validation
npm run quality:check
```

## Development Workflow

### Daily Development
```bash
# Start your day
./start-dev.sh

# Make changes to code
# Hot reload will automatically update the browser

# Run tests
npm run test

# Check code quality
npm run lint
npm run type-check

# End your day
# Press Ctrl+C to stop the server
```

### Common Tasks

#### Port Conflicts
```bash
# Clean ports before starting
npm run clean-ports

# Or start on different port
npm run dev:3001
```

#### Configuration Issues
```bash
# Validate configuration
npm run type-check

# Fix formatting issues
npm run format

# Reset environment
npm run clean
npm run fresh
```

#### Dependency Updates
```bash
# Check for updates
npm run check-dependencies

# Update dependencies
npm update

# Install new dependency
npm install package-name
```

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors
**Problem**: Missing dependencies or incorrect paths
**Solution**:
```bash
# Reinstall dependencies
npm run fresh

# Check TypeScript configuration
npm run type-check
```

#### 2. Port already in use
**Problem**: Port 3000 is occupied
**Solution**:
```bash
# Clean ports
npm run clean-ports

# Or use different port
npm run dev:3001
```

#### 3. TypeScript compilation errors
**Problem**: Type errors preventing startup
**Solution**:
```bash
# Check specific errors
npm run type-check

# Fix formatting
npm run format

# Check configuration
cat tsconfig.json
```

#### 4. Server won't start
**Problem**: Various startup issues
**Solution**:
```bash
# Full environment reset
npm run clean
npm run fresh
./start-dev.sh
```

### Debug Mode

#### Enable Debug Logging
```bash
# Set debug environment variable
export DEBUG_I18N=true
npm run dev:3000
```

#### Check Environment Status
```bash
# Validate all configurations
npm run quality:check

# Check specific components
npm run type-check
npm run lint
npm run test
```

## Configuration Reference

### Key Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `.env.local` - Environment variables

### Scripts Reference
```bash
# Development
npm run dev              # Start dev server (default port)
npm run dev:3000         # Start on port 3000
npm run dev:3001         # Start on port 3001

# Building
npm run build            # Build for production
npm run start            # Start production server

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run E2E tests

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run type-check       # Run TypeScript check
npm run format           # Format code with Prettier

# Environment
npm run clean-ports      # Clean occupied ports
npm run clean            # Clean build artifacts
npm run fresh            # Clean and reinstall
npm run quality:check    # Run all quality checks
```

## VS Code Integration

### Recommended Extensions
- **ES7+ React/Redux/React-Native snippets**
- **TypeScript Importer**
- **Prettier - Code formatter**
- **ESLint**
- **Tailwind CSS IntelliSense**
- **Auto Rename Tag**
- **Bracket Pair Colorizer**

### Tasks
Use `Ctrl+Shift+P` and search for:
- "Start Development Server"
- "Clean Ports"
- "Type Check"
- "Lint"
- "Build"

### Debugging
1. Set breakpoints in VS Code
2. Press `F5` to start debugging
3. Select "Next.js: debug full stack"

## Performance Tips

### Faster Startup
- Use `npm run dev:3000` instead of `npm run dev`
- Keep `node_modules` in SSD
- Close unnecessary applications

### Faster Compilation
- Use TypeScript incremental compilation
- Keep source files organized
- Avoid large file imports

### Better Development Experience
- Use VS Code with recommended extensions
- Enable auto-save
- Use keyboard shortcuts
- Keep terminal open for logs

## Getting Help

### Documentation
- [Development Guide](../DEVELOPMENT.md)
- [Project Structure](../PROJECT_STRUCTURE.md)
- [API Documentation](../contracts/environment-api.yaml)

### Support
- Check [troubleshooting section](#troubleshooting)
- Review [common issues](#common-issues)
- Check project issues on GitHub
- Contact development team

### Contributing
1. Follow the [development workflow](../development-workflow.md)
2. Run quality checks before committing
3. Write tests for new features
4. Update documentation as needed

## Next Steps

After completing the quick start:
1. Read the [full development guide](../DEVELOPMENT.md)
2. Explore the [project structure](../PROJECT_STRUCTURE.md)
3. Review the [API documentation](../contracts/environment-api.yaml)
4. Check out the [testing guide](../TESTING_GUIDE.md)

## Success Criteria

You know the setup is working when:
- ✅ Development server starts in <30 seconds
- ✅ No TypeScript compilation errors
- ✅ All npm scripts execute successfully
- ✅ Hot reload works for code changes
- ✅ Tests pass without errors
- ✅ Code quality checks pass

If any of these fail, refer to the [troubleshooting section](#troubleshooting) or contact the development team.
