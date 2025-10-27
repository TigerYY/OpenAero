import {
  loginSchema,
  registerSchema,
  userProfileSchema,
  creatorApplySchema,
  solutionSchema,
  reviewSchema,
  paginationSchema,
  fileUploadSchema,
  contactSchema,
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('validates correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };
      
      expect(() => loginSchema.parse(validData)).not.toThrow();
    });

    it('rejects invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      };
      
      expect(() => loginSchema.parse(invalidData)).toThrow();
    });

    it('rejects short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123',
      };
      
      expect(() => loginSchema.parse(invalidData)).toThrow();
    });
  });

  describe('registerSchema', () => {
    it('validates correct registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };
      
      expect(() => registerSchema.parse(validData)).not.toThrow();
    });

    it('validates without optional name', () => {
      const validData = {
        email: 'john@example.com',
        password: 'password123',
      };
      
      expect(() => registerSchema.parse(validData)).not.toThrow();
    });
  });

  describe('solutionSchema', () => {
    it('validates correct solution data', () => {
      const validData = {
        title: 'Test Solution',
        slug: 'test-solution',
        description: 'This is a test solution description that is long enough to pass validation requirements',
        longDescription: 'This is a longer description for testing purposes that meets the minimum character requirement of 50 characters',
        images: ['https://cdn.example.com/test-image.jpg'],
        price: 2999,
        categoryId: 'category-1',
        creatorId: 'creator-1',
        status: 'DRAFT' as const,
        specs: { weight: '1.2kg' },
        bom: { frame: 'Carbon Fiber' },
        features: ['GPS Navigation', 'Auto Landing'],
        tagIds: ['tag-1', 'tag-2'],
      };
      
      expect(() => solutionSchema.parse(validData)).not.toThrow();
    });

    it('rejects invalid slug format', () => {
      const invalidData = {
        title: 'Test Solution',
        slug: 'Invalid Slug!',
        description: 'This is a test solution description that is long enough to pass validation requirements',
        longDescription: 'This is a longer description for testing purposes that meets the minimum character requirement of 50 characters',
        images: ['https://cdn.example.com/test-image.jpg'],
        price: 2999,
        categoryId: 'category-1',
        creatorId: 'creator-1',
        features: ['GPS Navigation', 'Auto Landing'],
      };
      
      expect(() => solutionSchema.parse(invalidData)).toThrow();
    });

    it('rejects negative price', () => {
      const invalidData = {
        title: 'Test Solution',
        slug: 'test-solution',
        description: 'This is a test solution description that is long enough to pass validation requirements',
        longDescription: 'This is a longer description for testing purposes that meets the minimum character requirement of 50 characters',
        images: ['https://cdn.example.com/test-image.jpg'],
        price: -100,
        categoryId: 'category-1',
        creatorId: 'creator-1',
        features: ['GPS Navigation', 'Auto Landing'],
      };
      
      expect(() => solutionSchema.parse(invalidData)).toThrow();
    });
  });

  describe('reviewSchema', () => {
    it('validates correct review data', () => {
      const validData = {
        solutionId: 'solution-1',
        userId: 'user-1',
        rating: 5,
        comment: 'Great solution!',
      };
      
      expect(() => reviewSchema.parse(validData)).not.toThrow();
    });

    it('rejects rating out of range', () => {
      const invalidData = {
        solutionId: 'solution-1',
        userId: 'user-1',
        rating: 6,
        comment: 'Great solution!',
      };
      
      expect(() => reviewSchema.parse(invalidData)).toThrow();
    });
  });

  describe('paginationSchema', () => {
    it('validates correct pagination data', () => {
      const validData = {
        page: 1,
        limit: 20,
      };
      
      expect(() => paginationSchema.parse(validData)).not.toThrow();
    });

    it('uses default values', () => {
      const data = {};
      const result = paginationSchema.parse(data);
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('rejects invalid page number', () => {
      const invalidData = {
        page: 0,
        limit: 20,
      };
      
      expect(() => paginationSchema.parse(invalidData)).toThrow();
    });
  });

  describe('contactSchema', () => {
    it('validates correct contact data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'This is a test message',
      };
      
      expect(() => contactSchema.parse(validData)).not.toThrow();
    });

    it('rejects short message', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'Hi',
      };
      
      expect(() => contactSchema.parse(invalidData)).toThrow();
    });
  });
});
