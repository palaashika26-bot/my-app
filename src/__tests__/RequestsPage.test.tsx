import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AllRequestsPage from '../app/client-dashboard/requests/page';
import { requestsApi } from '../lib/api/requests.api';

jest.mock('../lib/api/requests.api');
const mockRequestsApi = requestsApi as jest.Mocked<typeof requestsApi>;

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../components/ClientLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../components/ui/StatusBadge', () => ({
  __esModule: true,
  default: ({ status }: { status: string }) => <span>{status}</span>,
}));

jest.mock('../components/SkeletonLoader', () => ({
  SkeletonTable: ({ rows, cols }: { rows: number; cols: number }) => (
    <div data-testid="skeleton-table" data-rows={rows} data-cols={cols}>Loading...</div>
  ),
}));

const MOCK_REQUESTS = [
  {
    id: 'req-1',
    requestNumber: 'REQ-001',
    requestType: 'SOURCING',
    status: 'SUBMITTED',
    totalBudgetINR: 10000,
    createdAt: new Date().toISOString(),
    items: [{ productName: 'Product A' }],
  },
  {
    id: 'req-2',
    requestNumber: 'REQ-002',
    requestType: 'QUOTATION',
    status: 'SUBMITTED',
    totalBudgetINR: 20000,
    createdAt: new Date().toISOString(),
    items: [{ productName: 'Product B' }],
  },
];

const createMockResponse = (data: any[]) => ({
  data: { data },
});

describe('RequestsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestsApi.getRequests.mockResolvedValue(createMockResponse(MOCK_REQUESTS) as any);
  });

  it('shows a loading skeleton while data is being fetched', async () => {
    let resolvePromise!: (v: any) => void;
    mockRequestsApi.getRequests.mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve; }) as any
    );

    render(<AllRequestsPage />);
    expect(screen.getByTestId('skeleton-table')).toBeInTheDocument();

    act(() => { resolvePromise(createMockResponse(MOCK_REQUESTS)); });
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton-table')).not.toBeInTheDocument();
    });
  });

  it('shows empty state only after confirmed empty response', async () => {
    mockRequestsApi.getRequests.mockResolvedValue(createMockResponse([]) as any);

    render(<AllRequestsPage />);
    expect(screen.queryByText(/no requests/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/no requests in this filter/i)).toBeInTheDocument();
    });
  });

  it('renders both SOURCING and QUOTATION requests returned by the API', async () => {
    render(<AllRequestsPage />);
    await waitFor(() => {
      expect(screen.getByText('REQ-001')).toBeInTheDocument();
      expect(screen.getByText('REQ-002')).toBeInTheDocument();
    });
  });

  it('calls getRequests on mount with limit: 100', async () => {
    render(<AllRequestsPage />);
    await waitFor(() => {
      expect(mockRequestsApi.getRequests).toHaveBeenCalledWith(
        { limit: 100 },
        expect.any(AbortSignal)
      );
    });
  });

  it('shows all request types by default (All tab)', async () => {
    render(<AllRequestsPage />);
    await waitFor(() => {
      expect(screen.getByText('REQ-001')).toBeInTheDocument();
      expect(screen.getByText('REQ-002')).toBeInTheDocument();
    });
  });

  it('aborts in-flight request on unmount — no state update warning', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let resolvePromise!: (v: any) => void;
    mockRequestsApi.getRequests.mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve; }) as any
    );

    const { unmount } = render(<AllRequestsPage />);
    unmount();
    act(() => { resolvePromise(createMockResponse(MOCK_REQUESTS)); });

    await Promise.resolve();
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Can't perform a React state update on an unmounted component")
    );
    consoleSpy.mockRestore();
  });
});
