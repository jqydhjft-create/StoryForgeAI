import { describe, expect, it } from 'vitest';
import type { StoryProject, StorySkillRequest, StorySkillResponse } from '../shared/types';
import { createInitialWorkflowState } from '../shared/workflowDefaults';
import {
  buildNextChapterContextPacket,
  runNextChapterWorkflow
} from '../renderer/services/nextChapterWorkflow';

const project: StoryProject = {
  rootPath: 'D:/Stories/Ash-Road',
  settings: { name: 'Ash Road', createdAt: '2026-06-08T00:00:00.000Z', reviewStrictness: 'medium' },
  world: {
    genre: '低魔末世',
    premise: '一名退隐骑士护送孤儿穿越荒原。',
    rules: ['瘟疫沿朝圣路蔓延'],
    terms: { 灰烬路: '穿过隔离王国的断裂古道' }
  },
  characters: [
    {
      id: 'ash',
      name: '阿砾',
      role: '主角',
      motivation: '弥补旧日失败',
      flaw: '把服从误认为荣誉',
      arc: '学会承担后果'
    },
    {
      id: 'milo',
      name: '米洛',
      role: '孤儿',
      motivation: '弄清自己的天赋',
      flaw: '过快相信危险',
      arc: '成为主动见证真相的人'
    }
  ],
  plot: [
    { id: 'opening', label: '开场意象', summary: '阿砾在废弃礼拜堂发现米洛。', chapterHint: 1 },
    { id: 'call', label: '守护召唤', summary: '医者指出米洛可能是瘟疫解药。', chapterHint: 2 }
  ],
  chapters: [
    {
      meta: { id: 1, title: '第一章', sceneCount: 1, characters: ['阿砾', '米洛'], locations: ['废弃礼拜堂'], timelineDay: 1 },
      content: '# 第一章\n\n阿砾在黎明时分发现米洛。'
    }
  ],
  summary: {
    timeline: [{ event: '阿砾发现米洛', time: 'Day 1', chapter: 1 }],
    locations: [{ name: '废弃礼拜堂', firstAppearance: 'Chapter 1', scenes: ['1.1'] }],
    characters: [{ name: '阿砾', firstChapter: 1, lastChapter: 1, statusChange: '开始守护米洛' }]
  },
  workflow: createInitialWorkflowState()
};

describe('nextChapterWorkflow', () => {
  it('builds a compact context packet for the next chapter', () => {
    const packet = buildNextChapterContextPacket(project);

    expect(packet.nextChapterId).toBe(2);
    expect(packet.recentChapters[0].title).toBe('第一章');
    expect(packet.characterStates.map((character) => character.name)).toEqual(['阿砾', '米洛']);
    expect(packet.openPlotBeats[0].label).toBe('守护召唤');
    expect(packet.summary.timeline[0].event).toBe('阿砾发现米洛');
  });

  it('uses only chapters before the target chapter as recent context', () => {
    const packet = buildNextChapterContextPacket(
      {
        ...project,
        chapters: [
          ...project.chapters,
          {
            meta: { id: 2, title: '第二章', sceneCount: 1, characters: ['阿砾'], locations: ['路边诊棚'], timelineDay: 2 },
            content: '# 第二章\n\n医者给出判断。'
          },
          {
            meta: { id: 3, title: '第三章', sceneCount: 1, characters: ['阿砾'], locations: ['荒原'], timelineDay: 3 },
            content: '# 第三章\n\n后文揭示了新的线索。'
          }
        ]
      },
      2
    );

    expect(packet.recentChapters.map((chapter) => chapter.id)).toEqual([1]);
  });

  it('uses the next chapter plugin capability and reviews the generated draft', async () => {
    const calls: StorySkillRequest[] = [];
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => {
      calls.push(request);

      if (request.skillId === 'next-chapter-workshop') {
        return {
          skillId: request.skillId,
          provider: 'deepseek',
          output: {
            chapter: {
              meta: {
                id: 2,
                title: '第二章：医者的判断',
                sceneCount: 2,
                characters: ['阿砾', '米洛'],
                locations: ['路边诊棚'],
                timelineDay: 2
              },
              content: '# 第二章：医者的判断\n\n医者认出了米洛血液中的异兆。'
            },
            reviewNotes: ['延续第一章的守护关系', '推进解药线索']
          }
        };
      }

      if (request.skillId === 'logic-detective') {
        return {
          skillId: request.skillId,
          provider: 'deepseek',
          output: {
            status: 'passed',
            summary: '生成章节通过连续性审核。'
          }
        };
      }

      throw new Error(`Unexpected skill ${request.skillId}`);
    };

    const result = await runNextChapterWorkflow(project, { skillRunner: runner });

    expect(calls.map((call) => call.skillId)).toEqual(['next-chapter-workshop', 'logic-detective']);
    expect(result.chapter.meta.title).toBe('第二章：医者的判断');
    expect(result.reviewNotes).toContain('推进解药线索');
    expect(result.reviewReport).toEqual({ status: 'passed', summary: '生成章节通过连续性审核。', issues: [] });
    expect(result.saveDecision).toBe('ready_to_save');
    expect(result.changeLog).toContain('DeepSeek Skill next-chapter-workshop 已应用');
    expect(result.changeLog).toContain('DeepSeek Skill logic-detective 已应用');
  });

  it('keeps the generated draft blocked when review fails after writing succeeds', async () => {
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => {
      if (request.skillId === 'next-chapter-workshop') {
        return {
          skillId: request.skillId,
          provider: 'deepseek',
          output: {
            chapter: {
              meta: {
                id: 2,
                title: '第二章：医者的判断',
                sceneCount: 2,
                characters: ['阿砾', '米洛'],
                locations: ['路边诊棚'],
                timelineDay: 2
              },
              content: '# 第二章：医者的判断\n\n医者认出了米洛血液中的异兆。'
            }
          }
        };
      }

      throw new Error('review service unavailable');
    };

    const result = await runNextChapterWorkflow(project, { skillRunner: runner });

    expect(result.chapter.meta.title).toBe('第二章：医者的判断');
    expect(result.saveDecision).toBe('blocked_by_review');
    expect(result.reviewReport.issues[0].message).toContain('review service unavailable');
  });
});
