// Mock API responses
export const mockApiResponse = <T,>(data: T, delay = 0): Promise<T> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const mockApiError = (message = 'API Error', delay = 0): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), delay);
  });
};

// Mock user data
export const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
};

export const mockAdmin = {
  id: '2',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
};

// Mock solutions data
export const mockSolution = {
  id: '1',
  title: 'Test Solution',
  description: 'A test solution for testing purposes',
  category: 'agriculture',
  tags: ['test', 'agriculture'],
  author: mockUser,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockSolutions = [
  mockSolution,
  {
    ...mockSolution,
    id: '2',
    title: 'Another Test Solution',
    category: 'surveillance',
    tags: ['test', 'surveillance'],
  },
];

// Test utilities
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

export const createMockIntersectionObserver = () => {
  const mockIntersectionObserver = () => ({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  (window as any).IntersectionObserver = mockIntersectionObserver;
};

export const createMockResizeObserver = () => {
  const mockResizeObserver = () => ({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  (window as any).ResizeObserver = mockResizeObserver;
};

// Mock messages for testing
export const mockMessages = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    reset: 'Reset',
    submit: 'Submit',
  },
  navigation: {
    home: 'Home',
    solutions: 'Solutions',
    creators: 'Creators',
    admin: 'Admin',
  },
  solutions: {
    title: 'Solutions',
    description: 'Explore drone solutions',
    noResults: 'No solutions found',
  },
};