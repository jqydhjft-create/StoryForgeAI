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

  it('keeps next chapter workshop prompts focused on continuity context', () => {
    const request = buildStorySkillRequest('next-chapter-workshop', '{"nextChapterId":2}');

    expect(request.systemPrompt).toContain('下一章');
    expect(request.outputSchema).toContain('"reviewNotes"');
    expect(request.exampleOutput).toContain('"chapter"');
  });
});
