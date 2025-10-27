// Test environment setup
// This file sets up the test environment for Jest and Playwright

// Mock global objects for Node.js environment
global.TransformStream = class TransformStream {
  constructor() {}
  get readable() { return new ReadableStream(); }
  get writable() { return new WritableStream(); }
};

// Mock Request and Response for API tests
global.Request = class Request {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new Map();
    this.body = options.body;
  }
  
  async json() {
    return JSON.parse(this.body || '{}');
  }
  
  async text() {
    return this.body || '';
  }
};

global.Response = class Response {
  constructor(body, options = {}) {
    this.status = options.status || 200;
    this.body = body;
  }
  
  async json() {
    return this.body;
  }
  
  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
  }
};

// Mock fetch
global.fetch = jest.fn();

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock URL
// Mock URL class with proper validation
global.URL = class URL {
  constructor(url, base) {
    // Use Node.js built-in URL for proper validation
    const nodeUrl = new (require('url').URL)(url, base);
    this.href = nodeUrl.href;
    this.pathname = nodeUrl.pathname;
    this.searchParams = new URLSearchParams(nodeUrl.search);
    this.protocol = nodeUrl.protocol;
    this.hostname = nodeUrl.hostname;
    this.port = nodeUrl.port;
    this.host = nodeUrl.host;
    this.origin = nodeUrl.origin;
  }
};

// Mock URLSearchParams
global.URLSearchParams = class URLSearchParams {
  constructor(init) {
    this.params = new Map();
    if (init) {
      if (typeof init === 'string') {
        init.split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          if (key) this.params.set(key, value || '');
        });
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.params.set(key, value));
      }
    }
  }
  
  get(name) {
    return this.params.get(name) || null;
  }
  
  set(name, value) {
    this.params.set(name, value);
  }
  
  append(name, value) {
    this.params.set(name, value);
  }
  
  toString() {
    return Array.from(this.params.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }
};
