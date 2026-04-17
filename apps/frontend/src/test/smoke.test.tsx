import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

function Hello() {
  return <span>Hola Vitest</span>;
}

describe('configuración Vitest', () => {
  it('renderiza un componente con Testing Library', () => {
    render(<Hello />);
    expect(screen.getByText('Hola Vitest')).toBeInTheDocument();
  });
});
