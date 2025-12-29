import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReturnReminder } from './ReturnReminder';

const mockTheme = {
  reminder: '✨ All houses visited! Return to the Post Office to complete your route! ✨'
};

describe('ReturnReminder', () => {
  it('should render nothing when not visible', () => {
    const { container } = render(
      <ReturnReminder isVisible={false} theme={mockTheme} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should match snapshot when visible', () => {
    const { container } = render(
      <ReturnReminder isVisible={true} theme={mockTheme} />
    );
    expect(container).toMatchSnapshot();
  });
});

