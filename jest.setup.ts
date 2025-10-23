// jest.setup.ts
import '@testing-library/jest-dom';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      $transaction: jest.fn(),
      solution: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      review: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    })),
  };
});