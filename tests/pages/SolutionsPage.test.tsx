import { render, screen, waitFor } from '@testing-library/react'
import { useSearchParams } from 'next/navigation'
import SolutionsPage from '@/app/solutions/page'

// Mock the useSearchParams hook
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}))

// Mock the SolutionCard component
jest.mock('@/components/business/SolutionCard', () => {
  return function MockSolutionCard({ solution }: { solution: any }) {
    return <div data-testid="solution-card">{solution.title}</div>
  }
})

// Mock the SearchFilters component
jest.mock('@/components/business/SearchFilters', () => {
  return function MockSearchFilters() {
    return <div data-testid="search-filters">Search Filters</div>
  }
})

// Mock the Pagination component
jest.mock('@/components/ui/Pagination', () => {
  return function MockPagination({ currentPage, totalPages, onPageChange }: any) {
    return (
      <div data-testid="pagination">
        Page {currentPage} of {totalPages}
        <button onClick={() => onPageChange(2)}>Next</button>
      </div>
    )
  }
})

// Mock fetch
global.fetch = jest.fn()

describe('SolutionsPage', () => {
  beforeEach(() => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('1'),
    })
    
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: '1',
            title: 'Test Solution 1',
            description: 'Test description 1',
            price: 2999,
            status: 'APPROVED',
          },
          {
            id: '2',
            title: 'Test Solution 2',
            description: 'Test description 2',
            price: 4599,
            status: 'PENDING_REVIEW',
          },
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      }),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders solutions page with title and description', async () => {
    render(<SolutionsPage />)
    
    expect(screen.getByText('解决方案市场')).toBeInTheDocument()
    expect(screen.getByText(/发现经过专业认证的无人机核心套件/)).toBeInTheDocument()
  })

  it('renders search filters', async () => {
    render(<SolutionsPage />)
    
    expect(screen.getByTestId('search-filters')).toBeInTheDocument()
  })

  it('displays loading state initially', () => {
    render(<SolutionsPage />)
    
    // Check for loading skeleton
    expect(screen.getAllByTestId('loading-skeleton')).toHaveLength(20)
  })

  it('displays solutions after loading', async () => {
    render(<SolutionsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Solution 1')).toBeInTheDocument()
      expect(screen.getByText('Test Solution 2')).toBeInTheDocument()
    })
  })

  it('displays error message when fetch fails', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'))
    
    render(<SolutionsPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/加载解决方案失败/)).toBeInTheDocument()
    })
  })

  it('displays no solutions message when no data', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        },
      }),
    })
    
    render(<SolutionsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('没有找到任何解决方案。')).toBeInTheDocument()
    })
  })

  it('renders pagination when there are multiple pages', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        pagination: {
          total: 50,
          page: 1,
          limit: 20,
          totalPages: 3,
        },
      }),
    })
    
    render(<SolutionsPage />)
    
    await waitFor(() => {
      expect(screen.getByTestId('pagination')).toBeInTheDocument()
    })
  })
})
