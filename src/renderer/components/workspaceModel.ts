import type {
  CharacterProfile,
  PlotBeat,
  SceneOutlineItem,
  StoryProject,
  TreeNodeKind,
  WorkflowStageId
} from '../../shared/types.js';
import {
  canInspectWorkflowStage,
  resolveWorkflowPanelView,
  type WorkflowPanelViewInput
} from './workflowPanelModel.js';

export type AssetType = 'world' | 'characters' | 'acts' | 'scene_outline' | 'chapters' | 'summary' | 'export';
export type ContextRailMode = 'history' | 'current';
export type ModelRunStatus = 'idle' | 'running' | 'success' | 'error';

export function resolveAssetListCollapsed(viewportWidth: number | undefined, explicitValue: boolean | null): boolean {
  if (explicitValue !== null) return explicitValue;
  return viewportWidth !== undefined && viewportWidth >= 1024 && viewportWidth < 1280;
}

export interface TreeSelection {
  kind: TreeNodeKind;
  id: string;
}

interface ContextListItemBase {
  id: string;
  label: string;
  detail?: string;
}

export type ContextListItem =
  | (ContextListItemBase & { kind: 'world'; value: StoryProject['world'] })
  | (ContextListItemBase & { kind: 'characters'; value: CharacterProfile })
  | (ContextListItemBase & { kind: 'acts'; value: PlotBeat })
  | (ContextListItemBase & { kind: 'scene_outline'; value: SceneOutlineItem })
  | (ContextListItemBase & { kind: 'chapters'; value: StoryProject['chapters'][number] })
  | (ContextListItemBase & { kind: 'summary'; value: StoryProject['summary'] });

export interface ContextRailView {
  mode: ContextRailMode;
  stage: WorkflowStageId;
  canMutate: boolean;
  artifact: unknown;
  runStatus: ModelRunStatus;
  elapsedSeconds: number;
  statusText: string;
  errorText: string;
}

export interface ModelRunView {
  status: ModelRunStatus;
  elapsedSeconds: number;
  canRetry: boolean;
  message: string;
}

export interface ContextListInput {
  kind: AssetType;
  project: StoryProject;
  query: string;
}

export interface ModelRunInput {
  isBusy: boolean;
  statusText: string;
  errorText: string;
  startedAt?: number | null;
  now: number;
  hasArtifact?: boolean;
  outcome?: 'success' | 'error' | null;
  completedElapsedSeconds?: number | null;
}

export interface ContextRailInput extends WorkflowPanelViewInput, ModelRunInput {
  statusText: string;
  errorText: string;
  startedAt?: number | null;
  now: number;
}

export function assetTypeForTreeSelection(selection: TreeSelection): AssetType {
  switch (selection.kind) {
    case 'character':
      return 'characters';
    case 'plot':
      return 'acts';
    case 'scene_outline':
      return 'scene_outline';
    case 'chapter':
      return 'chapters';
    default:
      return selection.kind;
  }
}

export function resolveContextList({ kind, project, query }: ContextListInput): ContextListItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  const matches = (...values: string[]) =>
    normalizedQuery === '' || values.some((value) => value.toLowerCase().includes(normalizedQuery));

  switch (kind) {
    case 'world':
      {
        const outline = project.workflow.artifacts.worldOutline;
        const label = outline?.worldDocument || project.settings.name;
        const detail = outline?.masterOutline || project.world.genre;
        const searchValues = outline
          ? [outline.worldDocument, outline.masterOutline]
          : [project.settings.name, project.world.genre, project.world.premise];

        return matches(...searchValues)
        ? [{
            id: 'bible',
            label,
            detail,
            kind: 'world',
            value: project.world
          }]
        : [];
      }
    case 'characters':
      return project.characters
        .filter((character) => matches(character.name, character.role))
        .map((character) => ({
          id: character.id,
          label: character.name,
          detail: character.role,
          kind: 'characters' as const,
          value: character
        }));
    case 'acts':
      return (project.workflow.artifacts.actTimeline?.acts.map((act) => ({
        id: act.id,
        label: act.title,
        summary: act.summary,
        value: { id: act.id, label: act.title, summary: act.summary, chapterHint: 0 }
      })) ?? project.plot.map((beat) => ({
        id: beat.id,
        label: beat.label,
        summary: beat.summary,
        value: beat
      })))
        .filter((act) => matches(act.label, act.summary))
        .map((act) => ({
          id: act.id,
          label: act.label,
          detail: act.summary,
          kind: 'acts' as const,
          value: act.value
        }));
    case 'chapters':
      return [...project.chapters]
        .sort((left, right) => left.meta.id - right.meta.id)
        .filter((chapter) => matches(chapter.meta.title, String(chapter.meta.id)))
        .map((chapter) => ({
          id: String(chapter.meta.id),
          label: `Chapter ${chapter.meta.id}: ${chapter.meta.title}`,
          kind: 'chapters' as const,
          value: chapter
        }));
    case 'scene_outline':
      return (project.workflow.artifacts.sceneOutline?.acts ?? [])
        .flatMap((act) => act.chapters)
        .sort((left, right) => left.chapterId - right.chapterId)
        .filter((chapter) => matches(String(chapter.chapterId), chapter.target, ...chapter.scenes.map((scene) => scene.summary)))
        .map((chapter) => ({
          id: chapter.id,
          label: `Chapter ${chapter.chapterId} outline`,
          detail: chapter.target,
          kind: 'scene_outline' as const,
          value: chapter
        }));
    case 'summary':
      return matches('Summary')
        ? [{ id: 'summary', label: 'Summary', kind: 'summary', value: project.summary }]
        : [];
    case 'export':
      return [];
  }
}

export function resolveModelRunView(input: ModelRunInput): ModelRunView {
  const elapsedSeconds = input.outcome !== null && input.outcome !== undefined && input.completedElapsedSeconds !== null && input.completedElapsedSeconds !== undefined
    ? input.completedElapsedSeconds
    : (input.startedAt == null ? 0 : Math.max(0, Math.floor((input.now - input.startedAt) / 1000)));

  if (input.isBusy) {
    return { status: 'running', elapsedSeconds, canRetry: false, message: input.statusText };
  }
  if (input.outcome === 'error') {
    return { status: 'error', elapsedSeconds, canRetry: true, message: input.errorText };
  }
  if (input.outcome === 'success') {
    return { status: 'success', elapsedSeconds, canRetry: false, message: input.statusText };
  }
  if (input.errorText) {
    return { status: 'error', elapsedSeconds, canRetry: true, message: input.errorText };
  }
  if (input.hasArtifact) {
    return { status: 'success', elapsedSeconds, canRetry: false, message: input.statusText };
  }
  return { status: 'idle', elapsedSeconds, canRetry: false, message: input.statusText };
}

export function resolveContextRailView(input: ContextRailInput): ContextRailView | null {
  if (!canInspectWorkflowStage(input.workflow, input.viewedStage)) {
    return null;
  }

  const panel = resolveWorkflowPanelView(input);
  const run = resolveModelRunView({
    ...input,
    hasArtifact: panel.artifact !== undefined && panel.artifact !== null
  });

  return {
    mode: panel.mode,
    stage: panel.stage,
    canMutate: panel.mode === 'current' &&
      !panel.isBusy &&
      (panel.primaryAction !== null || panel.canRegenerate || panel.canForceSave),
    artifact: panel.artifact,
    runStatus: run.status,
    elapsedSeconds: run.elapsedSeconds,
    statusText: input.statusText,
    errorText: input.errorText
  };
}
