import { workflowBenchmarkCases } from '../../shared/workflowBenchmarkCases.js';
import type { ChapterContextPacket } from '../../shared/types.js';
import { generateReviewedChapterDraft } from './chapterDraftWorkflow.js';
import { createMockStoryPlugin } from './plugins/mockStoryPlugin.js';
import { createPluginRegistry } from './plugins/storyPluginTypes.js';
import type { StoryPlugin } from './plugins/storyPluginTypes.js';
import { normalizeActTimeline } from './workflowArtifacts.js';
import { generateStageArtifact } from './workflowStageActions.js';

export interface StructuralBenchmarkCaseResult {
  id: string;
  assetsComplete: boolean;
  crossReferencesValid: boolean;
  chapterContinuity: boolean;
  reviewBlocked: boolean;
}

export async function runStructuralBenchmark() {
  const cases = await Promise.all(workflowBenchmarkCases.map(runFixtureCase));
  return {
    cases,
    invalidOutput: invalidOutputResult()
  };
}

async function runFixtureCase({ id, idea }: (typeof workflowBenchmarkCases)[number]): Promise<StructuralBenchmarkCaseResult> {
  try {
    const registry = createPluginRegistry([createMockStoryPlugin()]);
    const intake = await generateStageArtifact(registry, 'intake', { idea });
    const world = await generateStageArtifact(registry, 'world_outline', { initialSettingBook: intake });
    const characters = await generateStageArtifact(registry, 'character_bible', { initialSettingBook: intake, worldOutline: world });
    const timeline = await generateStageArtifact(registry, 'act_timeline', { initialSettingBook: intake, worldOutline: world, characters });
    const sceneOutline = await generateStageArtifact(registry, 'scene_outline', { actTimeline: timeline, worldOutline: world, characters });
    const chapterContext = createChapterContext(timeline, sceneOutline, characters);
    const firstDraft = await registry.invoke<ChapterContextPacket, { chapter: { meta: { id: number }; content: string } }>('write_chapter', chapterContext);
    const secondDraft = await registry.invoke<ChapterContextPacket, { chapter: { meta: { id: number }; content: string } }>('write_chapter', {
      ...chapterContext,
      chapterId: 2,
      currentChapterTarget: 'Continue from chapter one without resolving the central conflict.',
      recentChapterTexts: [{ id: 1, title: 'Chapter 1', content: firstDraft.chapter.content }]
    });
    const blockedRegistry = createPluginRegistry([createBlockingReviewPlugin(), createMockStoryPlugin()]);
    const blockedDraft = await generateReviewedChapterDraft(blockedRegistry, chapterContext);

    return {
      id,
      assetsComplete: Boolean(intake.genre && world.worldDocument && characters.length && timeline.acts.length && sceneOutline.acts.length && firstDraft.chapter.content),
      crossReferencesValid: sceneOutline.acts.every((act) => timeline.acts.some((timelineAct) => timelineAct.id === act.actId) && act.chapters.every((chapter) => chapter.actId === act.actId)),
      chapterContinuity: firstDraft.chapter.meta.id === 1 && secondDraft.chapter.meta.id === 2 && secondDraft.chapter.content.length > 0,
      reviewBlocked: blockedDraft.saveDecision === 'blocked_by_review'
    };
  } catch {
    return { id, assetsComplete: false, crossReferencesValid: false, chapterContinuity: false, reviewBlocked: false };
  }
}

function createChapterContext(timeline: Awaited<ReturnType<typeof generateStageArtifact<'act_timeline'>>>, sceneOutline: Awaited<ReturnType<typeof generateStageArtifact<'scene_outline'>>>, characters: Awaited<ReturnType<typeof generateStageArtifact<'character_bible'>>>) : ChapterContextPacket {
  const act = timeline.acts[0];
  const chapter = sceneOutline.acts[0].chapters[0];
  return {
    chapterId: 1,
    currentChapterTarget: chapter.target,
    currentActOutline: act,
    anchors: chapter.anchors,
    stateMachine: { characterStates: characters.map((character) => ({ name: character.name, role: character.role, status: 'introduced' })), foreshadowing: [] },
    previousActSummary: '',
    currentActSummary: sceneOutline.acts[0].summary,
    recentChapterTexts: [],
    matchedHistoryFragments: []
  };
}

function createBlockingReviewPlugin(): StoryPlugin {
  return {
    id: 'benchmark-blocking-review',
    capabilities: {
      review_chapter: async () => ({
        status: 'issues_found',
        summary: 'Fixture review deliberately blocks persistence.',
        issues: [{ id: 'fixture-block', severity: 'error', message: 'Fixture continuity conflict.' }]
      })
    }
  };
}

function invalidOutputResult() {
  try {
    normalizeActTimeline({ acts: [] });
    return { failureVisible: false, confirmed: true };
  } catch {
    return { failureVisible: true, confirmed: false };
  }
}
