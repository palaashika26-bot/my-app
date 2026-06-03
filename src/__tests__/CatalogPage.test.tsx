import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CatalogPage from '../app/catalog/page';
import { requestsApi } from '../lib/api/requests.api';
import { productsApi } from '../lib/api/products.api';

jest.mock('../lib/api/requests.api');
jest.mock('../lib/api/products.api');

const mockRequestsApi = requestsApi as jest.Mocked<typeof requestsApi>;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../components/ClientLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../components/ui/Toast', () => ({
  useToast: () => ({ addToast: jest.fn() }),
}));

jest.mock('../components/ProductImage', () => ({
  __esModule: true,
  default: () => <div data-testid="product-image-placeholder" />,
}));

jest.mock('../lib/api/requestsCache', () => ({
  requestsCache: { set: jest.fn(), setList: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestsApi.createRequest.mockResolvedValue({
    data: { data: { id: 'req-new', requestNumber: 'REQ-001' } },
  } as any);
  localStorage.clear();
  window.scrollTo = jest.fn();
});

describe('CatalogPage', () => {
  it('renders product cards with Request Quotation buttons', async () => {
    render(<CatalogPage />);
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /request quotation/i });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('calls POST /requests with productId and requestType when button is clicked', async () => {
    render(<CatalogPage />);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /request quotation/i }).length).toBeGreaterThan(0);
    });

    const requestButtons = screen.getAllByRole('button', { name: /request quotation/i });
    await userEvent.click(requestButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/submit quotation request/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /submit quotation request/i }));

    await waitFor(() => {
      expect(mockRequestsApi.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          requestType: 'QUOTATION',
          items: expect.arrayContaining([
            expect.objectContaining({ productName: expect.any(String) }),
          ]),
        })
      );
    });
  });

  it('sends requestType QUOTATION in the POST body', async () => {
    render(<CatalogPage />);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /request quotation/i }).length).toBeGreaterThan(0);
    });

    await userEvent.click(screen.getAllByRole('button', { name: /request quotation/i })[0]);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit quotation request/i })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /submit quotation request/i }));

    await waitFor(() => {
      const callPayload = (mockRequestsApi.createRequest as jest.Mock).mock.calls[0][0];
      expect(callPayload.requestType).toBe('QUOTATION');
    });
  });

  it('does NOT render an <a> tag wrapping any product image', async () => {
    const { container } = render(<CatalogPage />);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /request quotation/i }).length).toBeGreaterThan(0);
    });

    const anchorsAroundImages = container.querySelectorAll('a img');
    expect(anchorsAroundImages.length).toBe(0);
  });
});
