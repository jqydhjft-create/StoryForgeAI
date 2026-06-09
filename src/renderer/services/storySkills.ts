import type { StorySkillId, StorySkillRequest, StorySkillResponse } from '../../shared/types.js';

export type StorySkillRunner = (request: StorySkillRequest) => Promise<StorySkillResponse>;

interface StorySkillDefinition {
  id: StorySkillId;
  systemPrompt: string;
  outputSchema: string;
  repairPrompt: string;
  exampleInput: string;
  exampleOutput: string;
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

const repairPrompt = '只返回符合 schema 的 JSON，不要输出 Markdown、解释、代码块或额外文本。若输入信息不足，用明确但保守的占位内容补齐。';

const skillDefinitions: Record<StorySkillId, StorySkillDefinition> = {
  'theme-generator': {
    id: 'theme-generator',
    systemPrompt: '你是主题生成器。根据故事想法生成标题、主角、目标、冲突和三条主题声明。',
    outputSchema: json({
      title: 'string',
      protagonist: 'string',
      goal: 'string',
      conflict: 'string',
      themes: ['string', 'string', 'string']
    }),
    repairPrompt,
    exampleInput: json({ idea: '一名退隐骑士在荒原中保护一个孤儿。' }),
    exampleOutput: json({
      title: '荒原守望者',
      protagonist: '阿砾，一位背负旧誓的退隐骑士',
      goal: '保护可能治愈瘟疫的孤儿',
      conflict: '旧日荣誉准则与废土求生法则冲突',
      themes: ['守护意味着承担后果', '希望诞生于确定性崩塌处', '牺牲需要被后来者重新理解']
    })
  },
  'world-generator': {
    id: 'world-generator',
    systemPrompt: '你是世界观生成器。根据故事主题生成类型、前提、世界规则和术语表。',
    outputSchema: json({ genre: 'string', premise: 'string', rules: ['string'], terms: { 术语: '解释' } }),
    repairPrompt,
    exampleInput: json({ concept: { title: '荒原守望者', conflict: '荣誉与求生冲突' } }),
    exampleOutput: json({
      genre: '低魔末世',
      premise: '隔离王国之间只剩一条被瘟疫污染的朝圣路。',
      rules: ['瘟疫沿旧朝圣路蔓延', '遗物只有被记住历史时才会生效'],
      terms: { 灰烬路: '穿过隔离王国的断裂古道' }
    })
  },
  'character-generator': {
    id: 'character-generator',
    systemPrompt: '你是人物生成器。生成人物档案库，至少包含主角、关键同行者和反派。',
    outputSchema: json({
      characters: [{ id: 'string', name: 'string', role: 'string', motivation: 'string', flaw: 'string', arc: 'string' }]
    }),
    repairPrompt,
    exampleInput: json({ concept: { protagonist: '退隐骑士', goal: '保护孤儿' } }),
    exampleOutput: json({
      characters: [
        {
          id: 'ash',
          name: '阿砾',
          role: '主角',
          motivation: '弥补旧日失败',
          flaw: '把服从误认为荣誉',
          arc: '从被戒律束缚到主动承担后果'
        }
      ]
    })
  },
  'plot-designer': {
    id: 'plot-designer',
    systemPrompt: '你是情节设计器。生成五个核心情节点，覆盖开端、召唤、中点、考验和结局。',
    outputSchema: json({ plot: [{ id: 'string', label: 'string', summary: 'string', chapterHint: 1 }] }),
    repairPrompt,
    exampleInput: json({ concept: { goal: '保护孤儿', conflict: '荣誉与求生冲突' } }),
    exampleOutput: json({
      plot: [{ id: 'call', label: '守护召唤', summary: '医者指出孤儿可能是瘟疫解药。', chapterHint: 2 }]
    })
  },
  'scene-writing-workshop': {
    id: 'scene-writing-workshop',
    systemPrompt: '你是场景写作工坊。根据核心资产生成第一章草稿和章节元数据。',
    outputSchema: json({
      meta: { id: 1, title: 'string', sceneCount: 1, characters: ['string'], locations: ['string'], timelineDay: 1 },
      content: 'string'
    }),
    repairPrompt,
    exampleInput: json({ idea: '一名退隐骑士保护孤儿。', seed: { concept: { title: '荒原守望者' } } }),
    exampleOutput: json({
      meta: { id: 1, title: '第一章', sceneCount: 1, characters: ['阿砾', '米洛'], locations: ['废弃礼拜堂'], timelineDay: 1 },
      content: '# 第一章\n\n黎明时分，阿砾在废弃礼拜堂发现了米洛。'
    })
  },
  'theme-review': {
    id: 'theme-review',
    systemPrompt: '你是主题审查 Agent。检查主题声明、目标和冲突是否一致。',
    outputSchema: json({ status: 'passed|failed', summary: 'string', retryTarget: 'theme-generator' }),
    repairPrompt,
    exampleInput: json({ seed: { concept: { title: '荒原守望者' } } }),
    exampleOutput: json({ status: 'passed', summary: '主题、目标和冲突一致。' })
  },
  'character-review': {
    id: 'character-review',
    systemPrompt: '你是人物审查 Agent。检查人物动机、缺陷和成长弧是否支持故事。',
    outputSchema: json({ status: 'passed|failed', summary: 'string', retryTarget: 'character-generator' }),
    repairPrompt,
    exampleInput: json({ seed: { characters: [] } }),
    exampleOutput: json({ status: 'passed', summary: '人物弧线能够支撑主要冲突。' })
  },
  'plot-review': {
    id: 'plot-review',
    systemPrompt: '你是情节审查 Agent。检查情节点的因果、节奏和冲突推进。',
    outputSchema: json({ status: 'passed|failed', summary: 'string', retryTarget: 'plot-designer' }),
    repairPrompt,
    exampleInput: json({ seed: { plot: [] } }),
    exampleOutput: json({ status: 'passed', summary: '情节点因果清晰。' })
  },
  'world-review': {
    id: 'world-review',
    systemPrompt: '你是世界观审查 Agent。检查世界规则、术语和前提是否自洽。',
    outputSchema: json({ status: 'passed|failed', summary: 'string', retryTarget: 'world-generator' }),
    repairPrompt,
    exampleInput: json({ seed: { world: {} } }),
    exampleOutput: json({ status: 'passed', summary: '世界规则与故事前提一致。' })
  },
  'logic-detective': {
    id: 'logic-detective',
    systemPrompt: '你是逻辑侦探。检查时间线、地点、人物行为和因果断裂。',
    outputSchema: json({ status: 'passed|failed', summary: 'string', retryTarget: 'scene-writing-workshop' }),
    repairPrompt,
    exampleInput: json({ initialChapter: { meta: { id: 1 }, content: '...' } }),
    exampleOutput: json({ status: 'passed', summary: '没有发现时间线或因果断裂。' })
  },
  'integrated-gate': {
    id: 'integrated-gate',
    systemPrompt: '你是综合门禁。综合所有审查结论，判断是否可以写入核心资产层。',
    outputSchema: json({ status: 'passed|failed', summary: 'string' }),
    repairPrompt,
    exampleInput: json({ previousReports: [] }),
    exampleOutput: json({ status: 'passed', summary: '所有质量门禁通过。' })
  },
  'summary-ai': {
    id: 'summary-ai',
    systemPrompt: '你是摘要 AI。根据章节正文生成时间线、地点和人物状态摘要。',
    outputSchema: json({
      timeline: [{ event: 'string', time: 'string', chapter: 1 }],
      locations: [{ name: 'string', firstAppearance: 'string', scenes: ['string'] }],
      characters: [{ name: 'string', firstChapter: 1, lastChapter: 1, statusChange: 'string' }]
    }),
    repairPrompt,
    exampleInput: json({ chapters: [{ meta: { id: 1, title: '第一章' }, content: '...' }] }),
    exampleOutput: json({
      timeline: [{ event: '阿砾发现米洛', time: 'Day 1', chapter: 1 }],
      locations: [{ name: '废弃礼拜堂', firstAppearance: 'Chapter 1', scenes: ['1.1'] }],
      characters: [{ name: '阿砾', firstChapter: 1, lastChapter: 1, statusChange: '开始守护米洛' }]
    })
  },
  'next-chapter-workshop': {
    id: 'next-chapter-workshop',
    systemPrompt: '你是下一章写作工坊。根据紧凑上下文包生成下一章章节元数据、正文和连续性审查备注。',
    outputSchema: json({
      chapter: {
        meta: { id: 2, title: 'string', sceneCount: 1, characters: ['string'], locations: ['string'], timelineDay: 2 },
        content: 'string'
      },
      reviewNotes: ['string']
    }),
    repairPrompt,
    exampleInput: json({ nextChapterId: 2, recentChapters: [{ id: 1, title: '第一章', summary: '阿砾发现米洛。' }] }),
    exampleOutput: json({
      chapter: {
        meta: { id: 2, title: '第二章：医者的判断', sceneCount: 2, characters: ['阿砾', '米洛'], locations: ['路边诊棚'], timelineDay: 2 },
        content: '# 第二章：医者的判断\n\n医者认出了米洛血液中的异兆。'
      },
      reviewNotes: ['延续第一章的守护关系', '推进解药线索']
    })
  }
};

export function buildStorySkillRequest(skillId: StorySkillId, userPrompt: string): StorySkillRequest {
  const definition = skillDefinitions[skillId];
  return {
    skillId,
    systemPrompt: definition.systemPrompt,
    userPrompt,
    schemaHint: definition.outputSchema,
    outputSchema: definition.outputSchema,
    repairPrompt: definition.repairPrompt,
    exampleInput: definition.exampleInput,
    exampleOutput: definition.exampleOutput
  };
}

export function createDesktopSkillRunner(): StorySkillRunner | undefined {
  if (typeof window === 'undefined' || !window.storyforge?.runSkill) {
    return undefined;
  }

  return (request) => window.storyforge.runSkill(request);
}
