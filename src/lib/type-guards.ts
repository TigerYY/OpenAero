/**
 * Type guard utilities for deployment optimization
 * Provides runtime type checking and validation
 */

/**
 * Check if code is running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if code is running in server environment
 */
export function isServer(): boolean {
  return typeof window === 'undefined' || typeof document === 'undefined';
}

/**
 * Check if File API is available
 */
export function isFileAPIAvailable(): boolean {
  return isBrowser() && typeof File !== 'undefined';
}

/**
 * Check if a value is a File object
 */
export function isFile(value: any): value is File {
  return isFileAPIAvailable() && value instanceof File;
}

/**
 * Check if a value is a Blob object
 */
export function isBlob(value: any): value is Blob {
  return isBrowser() && typeof Blob !== 'undefined' && value instanceof Blob;
}

/**
 * Check if a value is a valid string
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * Check if a value is a valid number
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if a value is a valid boolean
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if a value is a valid object (not null)
 */
export function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Check if a value is a valid array
 */
export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

/**
 * Check if a value is undefined
 */
export function isUndefined(value: any): value is undefined {
  return value === undefined;
}

/**
 * Check if a value is null
 */
export function isNull(value: any): value is null {
  return value === null;
}

/**
 * Check if a value is null or undefined
 */
export function isNullOrUndefined(value: any): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if a value is a valid function
 */
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

/**
 * Check if a value is a valid Date object
 */
export function isDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if a value is a valid RegExp
 */
export function isRegExp(value: any): value is RegExp {
  return value instanceof RegExp;
}

/**
 * Check if a value is a valid Error object
 */
export function isError(value: any): value is Error {
  return value instanceof Error;
}

/**
 * Check if a value is a valid Promise
 */
export function isPromise(value: any): value is Promise<any> {
  return value && typeof value.then === 'function';
}

/**
 * Check if a value is a valid URL string
 */
export function isURL(value: any): value is string {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a value is a valid email string
 */
export function isEmail(value: any): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Check if a value is a valid UUID string
 */
export function isUUID(value: any): value is string {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Check if a value is a valid JSON string
 */
export function isJSONString(value: any): value is string {
  if (!isString(value)) return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a value is a valid Prisma Decimal
 */
export function isPrismaDecimal(value: any): boolean {
  return value && typeof value === 'object' && 
         typeof value.toNumber === 'function' && 
         typeof value.toString === 'function';
}

/**
 * Check if a value is a valid Locale string
 */
export function isLocale(value: any): value is string {
  if (!isString(value)) return false;
  const localeRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
  return localeRegex.test(value);
}

/**
 * Safe type assertion with runtime check
 */
export function assertType<T>(
  value: any, 
  typeGuard: (value: any) => value is T, 
  errorMessage?: string
): asserts value is T {
  if (!typeGuard(value)) {
    throw new Error(errorMessage || `Expected value to be of type ${typeof value}`);
  }
}

/**
 * Safe type casting with fallback
 */
export function safeCast<T>(
  value: any, 
  typeGuard: (value: any) => value is T, 
  fallback: T
): T {
  return typeGuard(value) ? value : fallback;
}
