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

function collectKeywords(target: string, anchors: Array<{ text: string }>, memory: StoryMemoryState): string[] {
  const source = [
    target,
    ...anchors.map((anchor) => anchor.text),
    ...memory.foreshadowing.filter((item) => item.status === 'open').map((item) => item.text)
  ].join(' ');

  return Array.from(new Set(source.toLowerCase().match(/[a-z0-9]+/g) ?? [])).filter((word) => word.length > 3);
}

function matchHistoryFragments(memory: StoryMemoryState, keywords: string[]) {
  if (keywords.length === 0) return [];
  return memory.recentEvents
    .filter((event) => keywords.some((keyword) => event.summary.toLowerCase().includes(keyword)))
    .map((event) => ({ source: `chapter-${event.chapterId}`, text: event.summary }));
}

export function buildChapterContextPacket(input: ChapterContextInput): ChapterContextPacket {
  const actIndex = input.actTimeline.acts.findIndex((act) => act.id === input.actId);
  const currentAct = input.actTimeline.acts[actIndex];
  if (!currentAct) {
    throw new Error(`Act ${input.actId} was not found`);
  }

  const sceneAct = input.sceneOutline.acts.find((act) => act.actId === input.actId);
  const chapterOutline = sceneAct?.chapters.find((chapter) => chapter.chapterId === input.chapterId);
  if (!chapterOutline) {
    throw new Error(`Chapter ${input.chapterId} outline was not found in ${input.actId}`);
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
    currentChapterTarget: chapterOutline.target,
    currentActOutline: currentAct,
    anchors: chapterOutline.anchors,
    stateMachine: {
      characterStates: input.memory.characterStates,
      foreshadowing: input.memory.foreshadowing,
      locationStates: input.memory.locationStates,
      objectStates: input.memory.objectStates,
      activeWorldRules: input.memory.activeWorldRules,
      openConflicts: input.memory.openConflicts
    },
    previousActSummary,
    currentActSummary,
    recentChapterTexts,
    matchedHistoryFragments: matchHistoryFragments(input.memory, keywords)
  };
}
