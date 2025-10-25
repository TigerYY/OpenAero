#!/usr/bin/env node

/**
 * TypeScript Configuration Validation Script
 * Validates tsconfig.json configuration for deployment optimization
 */

const fs = require('fs');
const path = require('path');

// Load tsconfig.json
const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

// Validation rules
const validationRules = {
  // Required compiler options
  required: [
    'target',
    'strict',
    'moduleResolution',
    'baseUrl',
    'paths'
  ],
  
  // Recommended settings for deployment optimization
  recommended: {
    target: 'ES2022',
    strict: true,
    exactOptionalPropertyTypes: false, // Allow flexibility for optional properties
    noImplicitOverride: true,
    noUncheckedIndexedAccess: true,
    moduleResolution: 'bundler'
  },
  
  // Path mappings that should exist
  requiredPaths: [
    '@/*',
    '@/components/*',
    '@/lib/*',
    '@/types/*',
    '@/app/*',
    '@/messages/*'
  ]
};

// Validation functions
function validateRequiredOptions() {
  const errors = [];
  const { compilerOptions } = tsconfig;
  
  for (const option of validationRules.required) {
    if (!(option in compilerOptions)) {
      errors.push(`Missing required compiler option: ${option}`);
    }
  }
  
  return errors;
}

function validateRecommendedSettings() {
  const warnings = [];
  const { compilerOptions } = tsconfig;
  
  for (const [option, expectedValue] of Object.entries(validationRules.recommended)) {
    if (compilerOptions[option] !== expectedValue) {
      warnings.push(`Consider setting ${option} to ${expectedValue} (current: ${compilerOptions[option]})`);
    }
  }
  
  return warnings;
}

function validatePathMappings() {
  const errors = [];
  const { compilerOptions } = tsconfig;
  
  if (!compilerOptions.paths) {
    errors.push('Missing path mappings configuration');
    return errors;
  }
  
  for (const requiredPath of validationRules.requiredPaths) {
    if (!(requiredPath in compilerOptions.paths)) {
      errors.push(`Missing required path mapping: ${requiredPath}`);
    }
  }
  
  return errors;
}

function validateFileStructure() {
  const errors = [];
  const { include, exclude } = tsconfig;
  
  // Check if include patterns exist
  if (!include || !Array.isArray(include)) {
    errors.push('Missing or invalid include patterns');
  }
  
  // Check if exclude patterns exist
  if (!exclude || !Array.isArray(exclude)) {
    errors.push('Missing or invalid exclude patterns');
  }
  
  // Check if source directory exists
  const srcDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    errors.push('Source directory (src/) not found');
  }
  
  return errors;
}

function validateTypeScriptVersion() {
  const errors = [];
  
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const typescriptVersion = packageJson.devDependencies?.typescript;
    if (!typescriptVersion) {
      errors.push('TypeScript not found in devDependencies');
    } else {
      const version = typescriptVersion.replace(/[\^~]/, '');
      const majorVersion = parseInt(version.split('.')[0]);
      
      if (majorVersion < 5) {
        errors.push(`TypeScript version ${version} is too old. Recommended: 5.0+`);
      }
    }
  } catch (error) {
    errors.push(`Failed to read package.json: ${error.message}`);
  }
  
  return errors;
}

// Main validation
function main() {
  console.log('🔍 Validating TypeScript configuration...\n');
  
  const errors = [
    ...validateRequiredOptions(),
    ...validatePathMappings(),
    ...validateFileStructure(),
    ...validateTypeScriptVersion()
  ];
  
  const warnings = [
    ...validateRecommendedSettings()
  ];
  
  // Report results
  if (errors.length > 0) {
    console.log('❌ Validation failed with errors:');
    errors.forEach(error => console.log(`  • ${error}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(warning => console.log(`  • ${warning}`));
    console.log('');
  }
  
  if (errors.length === 0) {
    console.log('✅ TypeScript configuration is valid!');
    
    // Additional checks
    const { compilerOptions } = tsconfig;
    console.log('\n📊 Configuration Summary:');
    console.log(`  • Target: ${compilerOptions.target}`);
    console.log(`  • Strict mode: ${compilerOptions.strict}`);
    console.log(`  • Exact optional property types: ${compilerOptions.exactOptionalPropertyTypes}`);
    console.log(`  • Module resolution: ${compilerOptions.moduleResolution}`);
    console.log(`  • Path mappings: ${Object.keys(compilerOptions.paths || {}).length} configured`);
    
    // Performance recommendations
    console.log('\n🚀 Performance Recommendations:');
    if (compilerOptions.exactOptionalPropertyTypes === false) {
      console.log('  • exactOptionalPropertyTypes is disabled for flexibility');
    }
    if (compilerOptions.noUncheckedIndexedAccess === true) {
      console.log('  • noUncheckedIndexedAccess is enabled for safety');
    }
    if (compilerOptions.noImplicitOverride === true) {
      console.log('  • noImplicitOverride is enabled for clarity');
    }
  }
  
  // Exit with error code if validation failed
  if (errors.length > 0) {
    process.exit(1);
  }
}

// Run validation
if (require.main === module) {
  main();
}

module.exports = {
  validateRequiredOptions,
  validateRecommendedSettings,
  validatePathMappings,
  validateFileStructure,
  validateTypeScriptVersion
};
