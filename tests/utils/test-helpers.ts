// Test helper utilities
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// Mock data generators
export const createMockSolution = (overrides = {}) => ({
  id: '1',
  title: 'Test Solution',
  slug: 'test-solution',
  description: 'This is a test solution description',
  longDescription: 'This is a longer description for testing',
  images: ['/test-image.jpg'],
  price: 2999,
  categoryId: 'test-category',
  creatorId: 'test-creator',
  status: 'APPROVED' as const,
  specs: {
    weight: '1.2kg',
    flightTime: '25min',
    range: '5km'
  },
  bom: {
    frame: 'Carbon Fiber',
    motors: '4x 2207 2400KV'
  },
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  averageRating: 4.5,
  reviewCount: 10,
  creator: {
    id: 'creator-1',
    userId: 'user-1',
    bio: 'Test creator bio',
    website: 'https://test.com',
    experience: '5 years experience',
    specialties: ['FPV', 'Aerial Photography'],
    status: 'APPROVED' as const,
    revenue: 50000,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    user: {
      name: 'Test Creator',
      avatar: '/avatar.jpg'
    }
  },
  ...overrides
});

export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatar: '/avatar.jpg',
  role: 'CUSTOMER' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

export const createMockCreator = (overrides = {}) => ({
  id: 'creator-1',
  userId: 'user-1',
  bio: 'Test creator bio',
  website: 'https://test.com',
  experience: '5 years experience',
  specialties: ['FPV', 'Aerial Photography'],
  status: 'APPROVED' as const,
  revenue: 50000,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

export const createMockReview = (overrides = {}) => ({
  id: 'review-1',
  solutionId: 'solution-1',
  userId: 'user-1',
  rating: 5,
  comment: 'Great solution!',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  ...overrides
});

// API response mocks
export const createMockApiResponse = <T>(data: T, overrides = {}) => ({
  success: true,
  data,
  message: 'Success',
  ...overrides
});

export const createMockPaginatedResponse = <T>(data: T[], overrides = {}) => ({
  success: true,
  data,
  pagination: {
    total: data.length,
    page: 1,
    limit: 20,
    totalPages: Math.ceil(data.length / 20),
  },
  ...overrides
});

// Test utilities
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 100));
};

export const mockFetch = (response: any, status = 200) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(response),
    text: jest.fn().mockResolvedValue(JSON.stringify(response)),
  });
};

export const mockFetchError = (message = 'Network error') => {
  global.fetch = jest.fn().mockRejectedValue(new Error(message));
};

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
