import type {
  ActScoreReport,
  ActTimeline,
  CharacterProfile,
  ChapterReviewReport,
  InitialSettingBook,
  SceneOutlineArtifact,
  WorldOutlineArtifact
} from '../../../shared/types.js';
import type { StoryPlugin } from './storyPluginTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function ideaFrom(input: unknown): string {
  if (!isRecord(input)) return 'Untitled story';
  return stringValue(input.idea, stringValue(input.projectName, 'Untitled story'));
}

function chapterIdFrom(input: unknown): number {
  if (!isRecord(input)) return 1;
  return numberValue(input.chapterId, 1);
}

function characterNameFrom(input: unknown, index: number): string {
  if (!isRecord(input)) return '他';
  const characters = Array.isArray(input.characterStates) ? input.characterStates : [];
  return typeof characters[index]?.name === 'string' ? characters[index].name : '他';
}

function locationFrom(input: unknown): string {
  if (!isRecord(input)) return '未知之地';
  const target = typeof input.currentChapterTarget === 'string' ? input.currentChapterTarget : '';
  return target || '未知之地';
}

function buildInitialSettingBook(input: unknown): InitialSettingBook {
  const idea = ideaFrom(input);

  return {
    genre: 'Speculative mystery',
    worldPremise: idea,
    protagonist: 'A determined writer-protagonist',
    coreConflict: 'A hidden truth pushes against a fragile order.',
    readerFeeling: 'Curiosity',
    targetLength: 'Draft-length',
    requiredElements: []
  };
}

function buildWorldOutline(input: unknown): WorldOutlineArtifact {
  const projectName = isRecord(input) ? stringValue(input.projectName, 'Untitled story') : 'Untitled story';

  return {
    worldDocument: `${projectName} world document\n\nRules, locations, and tone are ready for drafting.`,
    masterOutline: `${projectName} master outline\n\nAct 1 opens the central mystery and points toward the first chapter.`
  };
}

function buildCharacterBible(): CharacterProfile[] {
  return [
    {
      id: 'protagonist',
      name: 'A determined writer-protagonist',
      role: 'Protagonist',
      motivation: 'Uncover the hidden truth.',
      flaw: 'Distrusts help from others.',
      arc: 'Learns to share the burden of the truth.'
    },
    {
      id: 'ally',
      name: 'A skeptical archivist',
      role: 'Ally',
      motivation: 'Protect the fragile order.',
      flaw: 'Avoids necessary risks.',
      arc: 'Chooses action over safety.'
    }
  ];
}

function buildActTimeline(): ActTimeline {
  return {
    acts: [
      {
        id: 'act-1',
        title: 'Act 1',
        time: 'Opening',
        location: 'Primary setting',
        characters: ['A determined writer-protagonist'],
        movement: 'The protagonist discovers the central problem.',
        summary: 'The opening act establishes the world, the protagonist, and the first irreversible choice.'
      }
    ]
  };
}

function buildSceneOutline(): SceneOutlineArtifact {
  return {
    acts: [
      {
        actId: 'act-1',
        summary: 'The first act turns an intriguing premise into a concrete chapter target.',
        chapters: [
          {
            id: 'chapter-1',
            actId: 'act-1',
            chapterId: 1,
            target: 'Introduce the protagonist, the setting, and the first sign of trouble.',
            scenes: [
              {
                id: 'scene-1',
                summary: 'The protagonist notices a detail that does not fit.',
                characters: ['A determined writer-protagonist'],
                location: 'Primary setting'
              }
            ],
            anchors: [{ id: 'anchor-1', text: 'First sign of trouble', actId: 'act-1', chapterId: 1 }]
          }
        ]
      }
    ]
  };
}

function buildActScore(input: unknown): ActScoreReport {
  const actId = isRecord(input) ? stringValue(input.actId, 'act-1') : 'act-1';

  return {
    actId,
    plotContinuity: 8,
    characterConsistency: 8,
    pacingControl: 8,
    detailRichness: 8,
    comment: 'Mock scoring passed for local drafting.'
  };
}

function buildReview(): ChapterReviewReport {
  return {
    status: 'passed',
    summary: 'Mock review passed. No blocking continuity issues were found.',
    issues: []
  };
}

export function createMockStoryPlugin(): StoryPlugin {
  return {
    id: 'mock-story-plugin',
    capabilities: {
      generate_initial_brief: async (input) => buildInitialSettingBook(input),
      generate_world_and_outline: async (input) => buildWorldOutline(input),
      generate_characters: async () => buildCharacterBible(),
      generate_act_timeline: async () => buildActTimeline(),
      generate_scene_outline: async () => buildSceneOutline(),
      write_chapter: async (input) => {
        const chapterId = chapterIdFrom(input);
        const protagonist = characterNameFrom(input, 0);
        const location = locationFrom(input);

        const lines = [
          `# 第${chapterId}章`,
          '',
          `天色比预想的暗得更快。${protagonist}站在${location}的边缘，风从远处吹来，带着陌生的气味——不是尘土，也不是炊烟，而是某种更古老的东西。`,
          '',
          `"不能再等了。"`,
          '',
          `${protagonist}转过身。身后的路已经被来时的脚印填满，而前方的路却模糊得像雾中的河。这一刻没有回头可言——不是因为没有勇气，而是因为回头的代价已经高过了继续前行的风险。`,
          '',
          `脚步声在碎石上发出细碎的响声。${protagonist}抬起手，指尖触碰到了那道门——不是普通的门，而是由光与记忆编织而成的入口。门的另一边，等待着的不是答案，而是另一个问题。`
        ];

        return {
          chapter: {
            meta: {
              id: chapterId,
              title: `第${chapterId}章`,
              sceneCount: 2,
              characters: [protagonist],
              locations: [location],
              timelineDay: chapterId
            },
            content: lines.join('\n')
          }
        };
      },
      review_chapter: async () => buildReview(),
      score_act: async (input) => buildActScore(input),
      review_full_text: async () => buildReview()
    }
  };
}
