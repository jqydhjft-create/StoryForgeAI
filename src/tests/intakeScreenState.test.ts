import { describe, expect, it } from 'vitest';
import { resolveIntakeScreen } from '../renderer/services/intakeScreenState';

describe('intake screen state', () => {
  it('shows confirmation after intake generation but before persistence', () => {
    expect(resolveIntakeScreen({ persistedArtifact: undefined, draft: undefined })).toBe('starter');
    expect(resolveIntakeScreen({ persistedArtifact: undefined, draft: { genre: 'Mystery' } })).toBe('confirm');
    expect(resolveIntakeScreen({ persistedArtifact: { genre: 'Mystery' }, draft: undefined })).toBe('workspace');
  });
});
