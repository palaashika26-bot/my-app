import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageLightbox from '../components/ImageLightbox';

describe('ImageLightbox component', () => {
  const SRC = 'https://example.com/photo.jpg';
  const onClose = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders the image with the provided src', () => {
    render(<ImageLightbox src={SRC} alt="Test image" onClose={onClose} />);
    const img = screen.getByRole('img', { name: 'Test image' });
    expect(img).toHaveAttribute('src', SRC);
  });

  it('renders with a close button visible', () => {
    render(<ImageLightbox src={SRC} onClose={onClose} />);
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('renders null when src is null', () => {
    const { container } = render(<ImageLightbox src={null} onClose={onClose} />);
    expect(container.innerHTML).toBe('');
  });

  it('calls onClose when the close button is clicked', async () => {
    render(<ImageLightbox src={SRC} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop (overlay) is clicked', () => {
    render(<ImageLightbox src={SRC} onClose={onClose} />);
    const overlay = document.querySelector('.fixed.inset-0');
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when the image itself is clicked', () => {
    render(<ImageLightbox src={SRC} onClose={onClose} />);
    fireEvent.click(screen.getByRole('img'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders a download link for http URLs', () => {
    render(<ImageLightbox src={SRC} onClose={onClose} />);
    const downloadLink = screen.getByText(/download/i);
    expect(downloadLink).toBeInTheDocument();
    expect(downloadLink.closest('a')).toHaveAttribute('href', SRC);
  });

  it('renders correctly with a base64 data-URL as src', () => {
    const b64 = 'data:image/png;base64,iVBORw0KGgo=';
    render(<ImageLightbox src={b64} onClose={onClose} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', b64);
  });
});
