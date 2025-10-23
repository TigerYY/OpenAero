#!/usr/bin/env node

/**
 * Translation validation script for OpenAero i18n
 * Validates that all translation files have consistent structure and keys
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MESSAGES_DIR = path.join(__dirname, '..', 'messages');
const SUPPORTED_LOCALES = ['zh-CN', 'en-US'];
const REQUIRED_NAMESPACES = ['common', 'navigation', 'language', 'errors'];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getNestedKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys = keys.concat(getNestedKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  return keys;
}

function validateTranslationFile(locale) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  
  if (!fs.existsSync(filePath)) {
    log(`❌ Translation file not found: ${filePath}`, 'red');
    return { valid: false, errors: [`File not found: ${filePath}`] };
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    log(`❌ Error reading file ${filePath}: ${error.message}`, 'red');
    return { valid: false, errors: [`Read error: ${error.message}`] };
  }

  let messages;
  try {
    messages = JSON.parse(content);
  } catch (error) {
    log(`❌ Invalid JSON in ${filePath}: ${error.message}`, 'red');
    return { valid: false, errors: [`JSON parse error: ${error.message}`] };
  }

  const errors = [];
  const warnings = [];

  // Check required namespaces
  for (const namespace of REQUIRED_NAMESPACES) {
    if (!messages[namespace]) {
      errors.push(`Missing required namespace: ${namespace}`);
    }
  }

  // Check for empty values
  const keys = getNestedKeys(messages);
  for (const key of keys) {
    const value = key.split('.').reduce((obj, k) => obj?.[k], messages);
    if (value === '' || value === null || value === undefined) {
      warnings.push(`Empty value for key: ${key}`);
    }
  }

  // Check for missing translations (placeholder values)
  for (const key of keys) {
    const value = key.split('.').reduce((obj, k) => obj?.[k], messages);
    if (typeof value === 'string' && value.includes('common.')) {
      warnings.push(`Possible missing translation for key: ${key} (value: ${value})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    keyCount: keys.length,
    namespaces: Object.keys(messages)
  };
}

function compareTranslationKeys() {
  const allKeys = {};
  
  for (const locale of SUPPORTED_LOCALES) {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const messages = JSON.parse(content);
        allKeys[locale] = getNestedKeys(messages).sort();
      } catch (error) {
        log(`❌ Error reading ${locale}: ${error.message}`, 'red');
        return { valid: false, errors: [`Error reading ${locale}: ${error.message}`] };
      }
    }
  }

  const locales = Object.keys(allKeys);
  if (locales.length < 2) {
    return { valid: true, warnings: ['Not enough locales to compare'] };
  }

  const errors = [];
  const warnings = [];

  // Compare keys between locales
  const baseLocale = locales[0];
  const baseKeys = allKeys[baseLocale];

  for (let i = 1; i < locales.length; i++) {
    const currentLocale = locales[i];
    const currentKeys = allKeys[currentLocale];

    // Find missing keys
    const missingInCurrent = baseKeys.filter(key => !currentKeys.includes(key));
    const missingInBase = currentKeys.filter(key => !baseKeys.includes(key));

    if (missingInCurrent.length > 0) {
      errors.push(`Missing keys in ${currentLocale}: ${missingInCurrent.join(', ')}`);
    }

    if (missingInBase.length > 0) {
      warnings.push(`Extra keys in ${currentLocale}: ${missingInBase.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalKeys: baseKeys.length
  };
}

function validateAll() {
  log('🔍 Starting translation validation...', 'blue');
  log('', 'reset');

  let allValid = true;
  const allErrors = [];
  const allWarnings = [];

  // Validate individual files
  for (const locale of SUPPORTED_LOCALES) {
    log(`📄 Validating ${locale}...`, 'cyan');
    const result = validateTranslationFile(locale);
    
    if (result.valid) {
      log(`✅ ${locale} is valid (${result.keyCount} keys, ${result.namespaces.length} namespaces)`, 'green');
    } else {
      log(`❌ ${locale} has errors:`, 'red');
      result.errors.forEach(error => log(`   - ${error}`, 'red'));
      allValid = false;
    }

    if (result.warnings.length > 0) {
      log(`⚠️  ${locale} warnings:`, 'yellow');
      result.warnings.forEach(warning => log(`   - ${warning}`, 'yellow'));
    }

    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    log('', 'reset');
  }

  // Compare keys between locales
  log('🔍 Comparing translation keys...', 'blue');
  const comparison = compareTranslationKeys();
  
  if (comparison.valid) {
    log(`✅ Key comparison passed (${comparison.totalKeys} total keys)`, 'green');
  } else {
    log(`❌ Key comparison failed:`, 'red');
    comparison.errors.forEach(error => log(`   - ${error}`, 'red'));
    allValid = false;
  }

  if (comparison.warnings.length > 0) {
    log(`⚠️  Key comparison warnings:`, 'yellow');
    comparison.warnings.forEach(warning => log(`   - ${warning}`, 'yellow'));
  }

  log('', 'reset');

  // Summary
  if (allValid) {
    log('🎉 All translations are valid!', 'green');
    process.exit(0);
  } else {
    log('❌ Translation validation failed!', 'red');
    log(`   Errors: ${allErrors.length}`, 'red');
    log(`   Warnings: ${allWarnings.length}`, 'yellow');
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  validateAll();
}

module.exports = {
  validateTranslationFile,
  compareTranslationKeys,
  validateAll
};
