import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const SimpleComponent = ({ name }: { name: string }) => <div>Hello {name}</div>;

describe('Unit Test Setup', () => {
  it('should pass basic assertion', () => {
    expect(true).toBe(true);
  });

  it('should render component correctly', () => {
    render(<SimpleComponent name="Vitest" />);
    expect(screen.getByText('Hello Vitest')).toBeDefined();
  });
});
