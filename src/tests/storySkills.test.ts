import { describe, expect, it } from 'vitest';
import { buildStorySkillRequest } from '../renderer/services/storySkills';

describe('storySkills', () => {
  it('builds skill requests with schema, repair instructions, and examples', () => {
    const request = buildStorySkillRequest('scene-writing-workshop', '{"idea":"A road story"}');

    expect(request.outputSchema).toContain('"meta"');
    expect(request.repairPrompt).toContain('只返回符合 schema 的 JSON');
    expect(request.exampleInput).toContain('idea');
    expect(request.exampleOutput).toContain('content');
  });

  it('keeps the unified chapter writer bound to workflow context', () => {
    const request = buildStorySkillRequest('chapter-draft-writer', '{"chapterId":1}');

    expect(request.systemPrompt).toContain('contextPacket.chapterId');
    expect(request.outputSchema).toContain('"chapter"');
    expect(request.exampleOutput).toContain('"chapter"');
  });
});
