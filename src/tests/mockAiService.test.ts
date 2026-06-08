import { describe, expect, it } from 'vitest';
import { generateStorySeed } from '../renderer/services/mockAiService';

describe('mockAiService', () => {
  it('turns an idea into editable story assets', () => {
    const result = generateStorySeed('A retired knight protects an orphan in the wasteland.');

    expect(result.concept.title).toBe('Wasteland Guardian');
    expect(result.concept.themes).toHaveLength(3);
    expect(result.world.rules[0]).toContain('scarcity');
    expect(result.characters).toHaveLength(3);
    expect(result.plot).toHaveLength(5);
  });
});
