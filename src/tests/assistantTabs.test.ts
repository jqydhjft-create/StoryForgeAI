import { describe, expect, it } from 'vitest';
import { assistantTabs } from '../renderer/components/assistantTabs';

describe('assistantTabs', () => {
  it('does not expose the legacy generate tab next to the workflow generate action', () => {
    expect(assistantTabs).toEqual(['review', 'summary', 'export']);
    expect(assistantTabs).not.toContain('generate');
  });
});
