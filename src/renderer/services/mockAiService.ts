import type { CharacterProfile, PlotBeat, StoryConcept, WorldBible } from '../../shared/types.js';

export interface StorySeed {
  concept: StoryConcept;
  world: WorldBible;
  characters: CharacterProfile[];
  plot: PlotBeat[];
}

export function generateStorySeed(idea: string): StorySeed {
  const trimmedIdea = idea.trim();
  if (trimmedIdea.length === 0) {
    return {
      concept: {
        title: '未命名故事',
        protagonist: '主角',
        goal: '明确故事目标',
        conflict: '明确核心冲突',
        themes: ['主题一', '主题二', '主题三']
      },
      world: {
        genre: '',
        premise: '',
        rules: [],
        terms: {}
      },
      characters: [
        {
          id: 'protagonist',
          name: '主角',
          role: '主角',
          motivation: '',
          flaw: '',
          arc: ''
        }
      ],
      plot: [
        { id: 'opening', label: '开端', summary: '填写故事开端。', chapterHint: 1 },
        { id: 'turning-point', label: '转折', summary: '填写关键转折。', chapterHint: 2 },
        { id: 'resolution', label: '结局', summary: '填写故事结局。', chapterHint: 3 }
      ]
    };
  }

  const premise = trimmedIdea;

  return {
    concept: {
      title: '荒原守望者',
      protagonist: '阿砾，一位背负旧誓的退隐骑士',
      goal: '保护一个也许能治愈荒原瘟疫的孤儿',
      conflict: '旧日荣誉准则与废土求生法则不断冲突',
      themes: [
        '守护不是服从规则，而是承担后果',
        '希望会在确定性崩塌之处生长',
        '牺牲的意义由生者与逝者共同定义'
      ]
    },
    world: {
      genre: '低魔末世',
      premise,
      rules: [
        '每个聚落都在匮乏中重新衡量道德',
        '瘟疫沿着古老朝圣路蔓延',
        '遗物只有在其历史被记住时才会生效'
      ],
      terms: {
        灰烬路: '穿过隔离王国的断裂古道',
        灰降季: '疫尘随风迁徙的季节'
      }
    },
    characters: [
      {
        id: 'ash',
        name: '阿砾',
        role: '主角',
        motivation: '弥补一场他始终不愿说出口的失败',
        flaw: '把服从误认为荣誉',
        arc: '从被戒律束缚的护卫，成长为愿意承担代价的守护者'
      },
      {
        id: 'milo',
        name: '米洛',
        role: '孤儿',
        motivation: '活到足够久，好弄清自己的天赋意味着什么',
        flaw: '更容易相信危险，而不是安慰',
        arc: '从惊惶的同行者，成长为主动选择见证真相的人'
      },
      {
        id: 'mutt',
        name: '穆特',
        role: '反派',
        motivation: '控制解药，以统治沿路聚落',
        flaw: '把怜悯视为战术弱点',
        arc: '从务实军阀滑向孤立暴君'
      }
    ],
    plot: [
      { id: 'opening', label: '开场意象', summary: '阿砾在一座废弃礼拜堂里发现米洛。', chapterHint: 1 },
      { id: 'call', label: '守护召唤', summary: '一位医者认出米洛可能是瘟疫解药的关键。', chapterHint: 2 },
      { id: 'midpoint', label: '虚假庇护', summary: '某个聚落愿意提供安全，条件是交出米洛。', chapterHint: 5 },
      { id: 'ordeal', label: '荣誉断裂', summary: '阿砾为了救孩子，亲手违背旧日戒律。', chapterHint: 8 },
      { id: 'finale', label: '见证之路', summary: '解药得以留存，因为沿路聚落选择合作。', chapterHint: 12 }
    ]
  };
}
