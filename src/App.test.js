import { render, screen } from '@testing-library/react';
import App from './App';

test('renders a light and dark mode toggle', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
});
