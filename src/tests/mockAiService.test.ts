import { describe, expect, it } from 'vitest';
import { generateStorySeed } from '../renderer/services/mockAiService';

describe('mockAiService', () => {
  it('turns a Chinese demo idea into editable story assets', () => {
    const result = generateStorySeed('一位退隐骑士在荒原中保护一个孤儿。');

    expect(result.concept.title).toBe('荒原守望者');
    expect(result.concept.themes).toHaveLength(3);
    expect(result.world.rules[0]).toContain('匮乏');
    expect(result.characters).toHaveLength(3);
    expect(result.characters[0].name).toBe('阿砾');
    expect(result.plot).toHaveLength(5);
    expect(result.plot[0].summary).toContain('废弃礼拜堂');
  });

  it('does not use demo story names when the idea is empty', () => {
    const result = generateStorySeed('');
    const serialized = JSON.stringify(result);

    expect(result.concept.title).toBe('未命名故事');
    expect(serialized).not.toContain('荒原守望者');
    expect(serialized).not.toContain('阿砾');
    expect(serialized).not.toContain('米洛');
  });
});
