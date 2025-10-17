import React from 'react';
import { render, screen } from '@testing-library/react';
import { SolutionCard } from '@/components/business/SolutionCard';
import { Solution } from '@/types';

const mockSolution: Solution = {
  id: '1',
  title: 'Test Solution',
  slug: 'test-solution',
  description: 'This is a test solution description',
  longDescription: 'This is a longer description for testing',
  images: ['/test-image.jpg'],
  price: 2999,
  categoryId: 'test-category',
  creatorId: 'test-creator',
  status: 'APPROVED',
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
    status: 'APPROVED',
    revenue: 50000,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    user: {
      name: 'Test Creator',
      avatar: '/avatar.jpg'
    }
  }
};

describe('SolutionCard Component', () => {
  it('renders solution information correctly', () => {
    render(<SolutionCard solution={mockSolution} />);
    
    expect(screen.getByText('Test Solution')).toBeInTheDocument();
    expect(screen.getByText('This is a test solution description')).toBeInTheDocument();
    expect(screen.getByText('¥2,999')).toBeInTheDocument();
  });

  it('displays creator information when available', () => {
    render(<SolutionCard solution={mockSolution} />);
    
    expect(screen.getByText('Test Creator')).toBeInTheDocument();
  });

  it('shows rating and review count when available', () => {
    render(<SolutionCard solution={mockSolution} />);
    
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(10)')).toBeInTheDocument();
  });

  it('displays specs as tags', () => {
    render(<SolutionCard solution={mockSolution} />);
    
    expect(screen.getByText('weight: 1.2kg')).toBeInTheDocument();
    expect(screen.getByText('flightTime: 25min')).toBeInTheDocument();
    expect(screen.getByText('range: 5km')).toBeInTheDocument();
  });

  it('shows status badge', () => {
    render(<SolutionCard solution={mockSolution} />);
    
    expect(screen.getByText('已认证')).toBeInTheDocument();
  });

  it('renders without creator information', () => {
    const solutionWithoutCreator = { ...mockSolution, creator: undefined };
    render(<SolutionCard solution={solutionWithoutCreator} />);
    
    expect(screen.getByText('Test Solution')).toBeInTheDocument();
    expect(screen.queryByText('Test Creator')).not.toBeInTheDocument();
  });

  it('handles solution without specs', () => {
    const solutionWithoutSpecs = { ...mockSolution, specs: undefined };
    render(<SolutionCard solution={solutionWithoutSpecs} />);
    
    expect(screen.getByText('Test Solution')).toBeInTheDocument();
    expect(screen.queryByText('weight: 1.2kg')).not.toBeInTheDocument();
  });
});
