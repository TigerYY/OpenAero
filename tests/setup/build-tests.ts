/**
 * Build test configuration and utilities
 * Provides testing setup for deployment optimization
 */

import { buildMonitor } from '../../src/lib/build-monitor';

// Mock console methods for testing
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

export function setupBuildTests() {
  // Mock console methods
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();

  // Reset build monitor
  buildMonitor.start();
}

export function teardownBuildTests() {
  // Restore console methods
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
}

export function mockBuildEnvironment() {
  // Mock process.env for build tests
  const originalEnv = process.env;
  
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
  };

  return () => {
    process.env = originalEnv;
  };
}

export function createMockBuildMetrics() {
  return {
    startTime: Date.now(),
    endTime: Date.now() + 1000,
    duration: 1000,
    errors: [],
    warnings: [],
    success: true,
  };
}

export function createMockBuildError() {
  return {
    startTime: Date.now(),
    endTime: Date.now() + 500,
    duration: 500,
    errors: ['TypeScript compilation failed'],
    warnings: ['Unused variable detected'],
    success: false,
  };
}

// Test utilities for TypeScript configuration
export function validateTypeScriptConfig(config: any) {
  const requiredFields = [
    'compilerOptions',
    'compilerOptions.target',
    'compilerOptions.strict',
    'compilerOptions.moduleResolution',
  ];

  for (const field of requiredFields) {
    const keys = field.split('.');
    let current = config;
    
    for (const key of keys) {
      if (current[key] === undefined) {
        throw new Error(`Missing required TypeScript config field: ${field}`);
      }
      current = current[key];
    }
  }

  return true;
}

// Test utilities for component boundaries
export function validateServerComponent(componentCode: string) {
  const browserAPIs = [
    'window',
    'document',
    'navigator',
    'localStorage',
    'sessionStorage',
    'File',
    'Blob',
    'FormData',
  ];

  const violations = browserAPIs.filter(api => 
    componentCode.includes(api) && !componentCode.includes(`typeof ${api} !== 'undefined'`)
  );

  if (violations.length > 0) {
    throw new Error(`Server component contains browser APIs: ${violations.join(', ')}`);
  }

  return true;
}

export function validateClientComponent(componentCode: string) {
  if (!componentCode.includes("'use client'")) {
    throw new Error('Client component missing "use client" directive');
  }

  return true;
}

// Test utilities for dependency validation
export function validateDependencyVersion(packageJson: any, packageName: string, minVersion: string) {
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const version = dependencies[packageName];

  if (!version) {
    throw new Error(`Package ${packageName} not found in dependencies`);
  }

  // Simple version comparison (for testing purposes)
  const cleanVersion = version.replace(/^[\^~]/, '');
  const [major, minor, patch] = cleanVersion.split('.').map(Number);
  const [minMajor, minMinor, minPatch] = minVersion.split('.').map(Number);

  if (major < minMajor || 
      (major === minMajor && minor < minMinor) || 
      (major === minMajor && minor === minMinor && patch < minPatch)) {
    throw new Error(`Package ${packageName} version ${version} is below minimum ${minVersion}`);
  }

  return true;
}

// Test utilities for translation validation
export function validateTranslationKeys(translations: Record<string, any>, requiredKeys: string[]) {
  const missingKeys = requiredKeys.filter(key => !(key in translations));
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing translation keys: ${missingKeys.join(', ')}`);
  }

  return true;
}

export function validateTranslationStructure(translations: Record<string, any>) {
  for (const [key, value] of Object.entries(translations)) {
    if (typeof value !== 'string' && typeof value !== 'object') {
      throw new Error(`Invalid translation value for key ${key}: expected string or object`);
    }
    
    if (typeof value === 'object' && value !== null) {
      validateTranslationStructure(value);
    }
  }

  return true;
}
