import { describe, expect, it } from 'vitest';
import { initialIdeaDraft, initialProjectName } from '../renderer/services/startupDefaults';

describe('startupDefaults', () => {
  it('starts real project inputs empty instead of prefilled with demo copy', () => {
    expect(initialProjectName).toBe('');
    expect(initialIdeaDraft).toBe('');
  });
});
