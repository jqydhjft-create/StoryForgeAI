import { describe, expect, it } from 'vitest';
import { runStoryWorkflow } from '../renderer/services/storyWorkflow';
import type { StorySkillRequest, StorySkillResponse } from '../shared/types';

describe('storyWorkflow', () => {
  it('orchestrates generated assets with quality gate reports', async () => {
    const result = await runStoryWorkflow({ idea: '一位退隐骑士在荒原中保护一个孤儿。' });

    expect(result.idea).toBe('一位退隐骑士在荒原中保护一个孤儿。');
    expect(result.seed.concept.title).toBe('荒原守望者');
    expect(result.gateReports.map((report) => report.id)).toEqual([
      'theme-review',
      'character-review',
      'plot-review',
      'world-review',
      'logic-detective',
      'integrated-gate'
    ]);
    expect(result.gateReports.every((report) => report.status === 'passed')).toBe(true);
    expect(result.contextDigest).toContain('世界观圣经');
    expect(result.changeLog).toContain('编排器完成起始故事资产生成');
  });

  it('includes an initial Chinese chapter draft from the scene writing workshop', async () => {
    const result = await runStoryWorkflow({ idea: '一位退隐骑士在荒原中保护一个孤儿。' });

    expect(result.initialChapter.meta.title).toBe('第一章');
    expect(result.initialChapter.meta.characters).toEqual(['阿砾', '米洛']);
    expect(result.initialChapter.meta.locations).toEqual(['废弃礼拜堂']);
    expect(result.initialChapter.content).toContain('黎明时分');
    expect(result.changeLog).toContain('Skill theme-generator 使用 mock：未配置模型 runner');
  });

  it('uses an injected skill runner before falling back to mock output', async () => {
    const calls: StorySkillRequest[] = [];
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => {
      calls.push(request);
      if (request.skillId === 'theme-generator') {
        return {
          skillId: request.skillId,
          provider: 'deepseek',
          output: {
            title: '深海城纪事',
            protagonist: '林澈，一名潮汐档案员',
            goal: '找回沉没城市的记忆核心',
            conflict: '记忆保存与现实生存互相冲突',
            themes: ['记忆需要被选择，而不是被囤积', '真相会改变共同体的边界', '牺牲必须被后来者重新理解']
          }
        };
      }
      throw new Error('Use mock fallback for the remaining skills');
    };

    const result = await runStoryWorkflow({ idea: '海底城市的档案员寻找失落记忆。' }, { skillRunner: runner });

    expect(calls[0].skillId).toBe('theme-generator');
    expect(calls.map((call) => call.skillId)).toContain('integrated-gate');
    expect(result.seed.concept.title).toBe('深海城纪事');
    expect(result.changeLog).toContain('DeepSeek Skill theme-generator 已应用');
    expect(result.changeLog).toContain('Skill world-generator 回落到 mock：Use mock fallback for the remaining skills');
    expect(result.changeLog).toContain('审查 Agent 加载 theme-review Skill');
    expect(result.gateReports).toHaveLength(6);
  });

  it('reruns a retry target once when a review gate fails', async () => {
    const calls: StorySkillRequest[] = [];
    let characterReviewCount = 0;
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => {
      calls.push(request);

      if (request.skillId === 'character-review') {
        characterReviewCount += 1;
        return {
          skillId: request.skillId,
          provider: 'deepseek',
          output: {
            status: characterReviewCount === 1 ? 'failed' : 'passed',
            summary: characterReviewCount === 1 ? '人物动机不清，需要重生成人物。' : '人物动机已修正。',
            retryTarget: characterReviewCount === 1 ? 'character-generator' : undefined
          }
        };
      }

      if (request.skillId === 'character-generator' && calls.filter((call) => call.skillId === 'character-generator').length > 1) {
        return {
          skillId: request.skillId,
          provider: 'deepseek',
          output: {
            characters: [
              {
                id: 'guardian',
                name: '林澈',
                role: '主角',
                motivation: '保护记忆核心',
                flaw: '拒绝信任他人',
                arc: '学会与同伴共享真相'
              }
            ]
          }
        };
      }

      throw new Error(`Use mock fallback for ${request.skillId}`);
    };

    const result = await runStoryWorkflow({ idea: '档案员寻找沉没城市的失落记忆。' }, { skillRunner: runner });

    expect(calls.filter((call) => call.skillId === 'character-generator')).toHaveLength(2);
    expect(result.seed.characters[0].name).toBe('林澈');
    expect(result.gateReports.every((report) => report.status === 'passed')).toBe(true);
    expect(result.changeLog).toContain('审查门禁 character-review 未通过，重试 character-generator');
  });
});
