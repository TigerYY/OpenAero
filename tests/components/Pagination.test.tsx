import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '@/components/ui/Pagination';

describe('Pagination Component', () => {
  const mockOnPageChange = jest.fn();

  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    onPageChange: mockOnPageChange,
  };

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  it('renders pagination with correct page numbers', () => {
    render(<Pagination {...defaultProps} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    
    const prevButton = screen.getByRole('button', { name: /previous/i });
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination {...defaultProps} currentPage={10} />);
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange when page number is clicked', () => {
    render(<Pagination {...defaultProps} />);
    
    const pageButton = screen.getByText('2');
    fireEvent.click(pageButton);
    
    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when next button is clicked', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when previous button is clicked', () => {
    render(<Pagination {...defaultProps} currentPage={2} />);
    
    const prevButton = screen.getByRole('button', { name: /previous/i });
    fireEvent.click(prevButton);
    
    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it('shows ellipsis when there are many pages', () => {
    render(<Pagination {...defaultProps} currentPage={5} totalPages={20} />);
    
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('highlights current page', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    
    const currentPageButton = screen.getByText('3');
    expect(currentPageButton).toHaveClass('bg-primary-600');
  });
});
