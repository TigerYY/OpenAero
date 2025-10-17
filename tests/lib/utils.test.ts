import { cn } from '@/lib/utils';

describe('Utils', () => {
  describe('cn function', () => {
    it('merges class names correctly', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('handles conditional classes', () => {
      const result = cn('class1', false && 'class2', 'class3');
      expect(result).toBe('class1 class3');
    });

    it('handles undefined and null values', () => {
      const result = cn('class1', undefined, null, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('handles empty strings', () => {
      const result = cn('class1', '', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('merges Tailwind classes correctly', () => {
      const result = cn('px-4 py-2', 'px-6');
      expect(result).toBe('py-2 px-6');
    });

    it('handles arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('handles objects with boolean values', () => {
      const result = cn({
        'class1': true,
        'class2': false,
        'class3': true,
      });
      expect(result).toBe('class1 class3');
    });

    it('handles mixed input types', () => {
      const result = cn(
        'class1',
        ['class2', 'class3'],
        {
          'class4': true,
          'class5': false,
        },
        'class6'
      );
      expect(result).toBe('class1 class2 class3 class4 class6');
    });
  });
});
