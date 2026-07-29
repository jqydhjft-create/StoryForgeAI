import type {
  ActScoreReport,
  ActTimeline,
  ActTimelineItem,
  InitialSettingBook,
  SceneOutlineArtifact,
  SceneOutlineItem,
  StoryAnchor,
  WorldOutlineArtifact
} from '../../shared/types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 10;
}

function invalid(message: string): never {
  throw new Error(message);
}

function cloneStringArray(value: string[]): string[] {
  return [...value];
}

function normalizeAnchor(value: unknown): StoryAnchor | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, text, actId, chapterId } = value;
  if (!isString(id) || !isString(text) || !isString(actId)) {
    return null;
  }

  if (chapterId !== undefined && typeof chapterId !== 'number') {
    return null;
  }

  return {
    id,
    text,
    actId,
    ...(chapterId !== undefined ? { chapterId } : {})
  };
}

function normalizeScene(value: unknown): { id: string; summary: string; characters: string[]; location: string } | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, summary, characters, location } = value;
  if (!isString(id) || !isString(summary) || !isStringArray(characters) || !isString(location)) {
    return null;
  }

  return {
    id,
    summary,
    characters: cloneStringArray(characters),
    location
  };
}

function normalizeSceneOutlineItem(value: unknown): SceneOutlineItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, actId, chapterId, target, scenes, anchors } = value;
  if (!isString(id) || !isString(actId) || typeof chapterId !== 'number' || !isString(target)) {
    return null;
  }
  if (!Array.isArray(scenes) || !Array.isArray(anchors)) {
    return null;
  }

  const normalizedScenes = scenes.map(normalizeScene);
  const normalizedAnchors = anchors.map(normalizeAnchor);
  if (normalizedScenes.some((scene) => scene === null) || normalizedAnchors.some((anchor) => anchor === null)) {
    return null;
  }

  return {
    id,
    actId,
    chapterId,
    target,
    scenes: normalizedScenes as SceneOutlineItem['scenes'],
    anchors: normalizedAnchors as StoryAnchor[]
  };
}

function requiresGlobalChapterResequence(acts: SceneOutlineArtifact['acts']): boolean {
  const chapterIds = acts.flatMap((act) => act.chapters.map((chapter) => chapter.chapterId));
  return chapterIds.some((chapterId) => !Number.isInteger(chapterId) || chapterId <= 0) || new Set(chapterIds).size !== chapterIds.length;
}

function resequenceSceneOutlineChapters(acts: SceneOutlineArtifact['acts']): SceneOutlineArtifact['acts'] {
  let nextChapterId = 1;

  return acts.map((act) => ({
    ...act,
    chapters: act.chapters.map((chapter) => {
      const originalChapterId = chapter.chapterId;
      const chapterId = nextChapterId++;

      return {
        ...chapter,
        chapterId,
        anchors: chapter.anchors.map((anchor) => (
          anchor.actId === act.actId && anchor.chapterId === originalChapterId
            ? { ...anchor, chapterId }
            : anchor
        ))
      };
    })
  }));
}

function normalizeActTimelineItem(value: unknown): ActTimelineItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, title, time, location, characters, movement, summary } = value;
  if (
    !isString(id) ||
    !isString(title) ||
    !isString(time) ||
    !isString(location) ||
    !isStringArray(characters) ||
    !isString(movement) ||
    !isString(summary)
  ) {
    return null;
  }

  return {
    id,
    title,
    time,
    location,
    characters: cloneStringArray(characters),
    movement,
    summary
  };
}

export function normalizeInitialSettingBook(value: unknown): InitialSettingBook {
  if (!isRecord(value)) {
    invalid('Invalid initial setting book');
  }

  const { genre, worldPremise, protagonist, coreConflict, readerFeeling, targetLength, requiredElements } = value;
  if (
    !isString(genre) ||
    !isString(worldPremise) ||
    !isString(protagonist) ||
    !isString(coreConflict) ||
    !isString(readerFeeling) ||
    !isString(targetLength) ||
    !isStringArray(requiredElements)
  ) {
    invalid('Invalid initial setting book');
  }

  return {
    genre,
    worldPremise,
    protagonist,
    coreConflict,
    readerFeeling,
    targetLength,
    requiredElements: cloneStringArray(requiredElements)
  };
}

export function normalizeWorldOutline(value: unknown): WorldOutlineArtifact {
  if (!isRecord(value)) {
    invalid('Invalid world outline');
  }

  const { worldDocument, masterOutline } = value;
  if (!isString(worldDocument) || !isString(masterOutline)) {
    invalid('Invalid world outline');
  }

  return {
    worldDocument,
    masterOutline
  };
}

export function normalizeActTimeline(value: unknown): ActTimeline {
  if (!isRecord(value) || !Array.isArray(value.acts) || value.acts.length === 0) {
    invalid('Invalid act timeline');
  }

  const acts = value.acts.map(normalizeActTimelineItem);
  if (acts.some((act) => act === null)) {
    invalid('Invalid act timeline');
  }

  return {
    acts: acts as ActTimelineItem[]
  };
}

export function normalizeSceneOutline(value: unknown): SceneOutlineArtifact {
  if (!isRecord(value) || !Array.isArray(value.acts) || value.acts.length === 0) {
    invalid('Invalid scene outline');
  }

  const acts = value.acts.map((act) => {
    if (!isRecord(act) || !isString(act.actId) || !isString(act.summary) || !Array.isArray(act.chapters)) {
      return null;
    }

    const chapters = act.chapters.map(normalizeSceneOutlineItem);
    if (chapters.some((chapter) => chapter === null)) {
      return null;
    }

    return {
      actId: act.actId,
      summary: act.summary,
      chapters: chapters as SceneOutlineItem[]
    };
  });

  if (acts.some((act) => act === null)) {
    invalid('Invalid scene outline');
  }

  const normalizedActs = acts as SceneOutlineArtifact['acts'];

  return {
    acts: requiresGlobalChapterResequence(normalizedActs)
      ? resequenceSceneOutlineChapters(normalizedActs)
      : normalizedActs
  };
}

export function normalizeActScoreReport(value: unknown): ActScoreReport {
  if (!isRecord(value)) {
    invalid('Invalid act score');
  }

  const { actId, plotContinuity, characterConsistency, pacingControl, detailRichness, comment } = value;
  if (
    !isString(actId) ||
    !isScore(plotContinuity) ||
    !isScore(characterConsistency) ||
    !isScore(pacingControl) ||
    !isScore(detailRichness) ||
    !isString(comment)
  ) {
    invalid('Invalid act score');
  }

  return {
    actId,
    plotContinuity,
    characterConsistency,
    pacingControl,
    detailRichness,
    comment
  };
}
