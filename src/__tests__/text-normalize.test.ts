import { describe, it, expect } from 'vitest';
import { normalizeLineBreakMarkup } from '../utils/element-conversion.js';

describe('normalizeLineBreakMarkup', () => {
  it('should convert <br> tags to newlines', () => {
    expect(normalizeLineBreakMarkup('Line 1<br>Line 2')).toBe('Line 1\nLine 2');
  });

  it('should convert <br/> tags to newlines', () => {
    expect(normalizeLineBreakMarkup('Line 1<br/>Line 2')).toBe('Line 1\nLine 2');
  });

  it('should convert <br /> tags with spaces', () => {
    expect(normalizeLineBreakMarkup('Line 1<br />Line 2')).toBe('Line 1\nLine 2');
  });

  it('should convert <BR> case-insensitively', () => {
    expect(normalizeLineBreakMarkup('Line 1<BR>Line 2')).toBe('Line 1\nLine 2');
  });

  it('should collapse 3+ consecutive newlines to 2', () => {
    expect(normalizeLineBreakMarkup('A\n\n\n\nB')).toBe('A\n\nB');
  });

  it('should handle text without any <br> or excess newlines', () => {
    const input = 'Plain text with no breaks';
    expect(normalizeLineBreakMarkup(input)).toBe(input);
  });

  it('should handle empty string', () => {
    expect(normalizeLineBreakMarkup('')).toBe('');
  });

  it('should convert multiple <br> tags', () => {
    expect(normalizeLineBreakMarkup('A<br>B<br>C')).toBe('A\nB\nC');
  });
});
