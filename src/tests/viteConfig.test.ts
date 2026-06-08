import { describe, expect, it } from 'vitest';
import config from '../../vite.config';

describe('vite config', () => {
  it('uses relative asset paths for Electron file loading', () => {
    expect(config.base).toBe('./');
  });
});
