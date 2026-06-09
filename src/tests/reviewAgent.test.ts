import { describe, expect, it } from 'vitest';
import type { StorySkillRequest, StorySkillResponse } from '../shared/types';
import { generateStorySeed } from '../renderer/services/mockAiService';
import { runReviewAgent } from '../renderer/services/reviewAgent';

describe('reviewAgent', () => {
  it('loads review skills sequentially through one agent', async () => {
    const calls: StorySkillRequest[] = [];
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => {
      calls.push(request);
      return {
        skillId: request.skillId,
        provider: 'deepseek',
        output: {
          status: request.skillId === 'character-review' ? 'failed' : 'passed',
          summary: `${request.skillId} checked`,
          retryTarget: request.skillId === 'character-review' ? 'character-generator' : undefined
        }
      };
    };

    const seed = generateStorySeed('一位退隐骑士在荒原中保护一个孤儿。');
    const result = await runReviewAgent(
      {
        idea: '一位退隐骑士在荒原中保护一个孤儿。',
        seed,
        initialChapter: {
          meta: {
            id: 1,
            title: '第一章',
            sceneCount: 1,
            characters: ['阿砾', '米洛'],
            locations: ['废弃礼拜堂'],
            timelineDay: 1
          },
          content: '# 第一章\n\n黎明时分，阿砾在一座废弃礼拜堂里发现了米洛。'
        }
      },
      runner
    );

    expect(calls.map((call) => call.skillId)).toEqual([
      'theme-review',
      'character-review',
      'plot-review',
      'world-review',
      'logic-detective',
      'integrated-gate'
    ]);
    expect(result.reports).toHaveLength(6);
    expect(result.reports[1]).toMatchObject({
      id: 'character-review',
      status: 'failed',
      retryTarget: 'character-generator'
    });
    expect(result.overall.status).toBe('failed');
    expect(result.changeLog).toContain('审查 Agent 加载 character-review Skill');
  });

  it('preserves world-generator as the retry target for world review failures', async () => {
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => ({
      skillId: request.skillId,
      provider: 'deepseek',
      output: {
        status: request.skillId === 'world-review' ? 'failed' : 'passed',
        summary: `${request.skillId} checked`,
        retryTarget: request.skillId === 'world-review' ? 'world-generator' : undefined
      }
    });

    const seed = generateStorySeed('一位退隐骑士在荒原中保护一个孤儿。');
    const result = await runReviewAgent(
      {
        idea: '一位退隐骑士在荒原中保护一个孤儿。',
        seed,
        initialChapter: {
          meta: {
            id: 1,
            title: '第一章',
            sceneCount: 1,
            characters: ['阿砾', '米洛'],
            locations: ['废弃礼拜堂'],
            timelineDay: 1
          },
          content: '# 第一章\n\n黎明时分，阿砾在一座废弃礼拜堂里发现了米洛。'
        }
      },
      runner
    );

    expect(result.reports.find((report) => report.id === 'world-review')).toMatchObject({
      status: 'failed',
      retryTarget: 'world-generator'
    });
    expect(result.overall.retryTarget).toBe('world-generator');
  });
});
