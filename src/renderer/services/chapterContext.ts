import type {
  ActTimeline,
  ChapterContextPacket,
  SceneOutlineArtifact,
  StoryMemoryState,
  StoryProject
} from '../../shared/types.js';

interface ChapterContextInput {
  project: StoryProject;
  actTimeline: ActTimeline;
  sceneOutline: SceneOutlineArtifact;
  memory: StoryMemoryState;
  actId: string;
  chapterId: number;
}

function cloneJsonData<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').toLowerCase();
}

function shouldKeepKeyword(word: string): boolean {
  return word.length > 3 || /[^\u0000-\u007f]/u.test(word);
}

function collectKeywords(target: string, anchors: Array<{ text: string }>, memory: StoryMemoryState): string[] {
  const source = [
    target,
    ...anchors.map((anchor) => anchor.text),
    ...memory.foreshadowing.filter((item) => item.status === 'open').map((item) => item.text)
  ].join(' ');

  return Array.from(new Set(normalizeSearchText(source).match(/[\p{L}\p{N}]+/gu) ?? [])).filter(shouldKeepKeyword);
}

function matchHistoryFragments(memory: StoryMemoryState, keywords: string[]) {
  if (keywords.length === 0) return [];
  return memory.recentEvents
    .filter((event) => keywords.some((keyword) => normalizeSearchText(event.summary).includes(keyword)))
    .map((event) => ({ source: `chapter-${event.chapterId}`, text: event.summary }));
}

export function buildChapterContextPacket(input: ChapterContextInput): ChapterContextPacket {
  const actIndex = input.actTimeline.acts.findIndex((act) => act.id === input.actId);
  const currentAct = input.actTimeline.acts[actIndex];
  if (!currentAct) {
    throw new Error(`Act ${input.actId} was not found`);
  }

  const sceneAct = input.sceneOutline.acts.find((act) => act.actId === input.actId);
  let chapterOutline = sceneAct?.chapters.find((chapter) => chapter.chapterId === input.chapterId);
  if (!chapterOutline) {
    chapterOutline = {
      id: `chapter-${input.chapterId}`,
      actId: input.actId,
      chapterId: input.chapterId,
      target: `延续${currentAct.title}幕的剧情，推进故事发展。`,
      scenes: [],
      anchors: []
    };
  }

  const recentChapterTexts = input.project.chapters
    .filter((chapter) => chapter.meta.id < input.chapterId)
    .sort((left, right) => left.meta.id - right.meta.id)
    .slice(-2)
    .map((chapter) => ({ id: chapter.meta.id, title: chapter.meta.title, content: chapter.content }));

  const previousActSummary = actIndex > 0 ? input.actTimeline.acts[actIndex - 1]?.summary ?? '' : '';
  const currentActSummary = sceneAct?.summary || currentAct.summary;
  const keywords = collectKeywords(chapterOutline.target, chapterOutline.anchors, input.memory);

  return {
    chapterId: input.chapterId,
    currentChapterTarget: chapterOutline.target,
    currentActOutline: cloneJsonData(currentAct),
    anchors: cloneJsonData(chapterOutline.anchors),
    stateMachine: cloneJsonData({
      characterStates: input.memory.characterStates,
      foreshadowing: input.memory.foreshadowing,
      locationStates: input.memory.locationStates,
      objectStates: input.memory.objectStates,
      activeWorldRules: input.memory.activeWorldRules,
      openConflicts: input.memory.openConflicts
    }),
    previousActSummary,
    currentActSummary,
    recentChapterTexts: cloneJsonData(recentChapterTexts),
    matchedHistoryFragments: cloneJsonData(matchHistoryFragments(input.memory, keywords))
  };
}
