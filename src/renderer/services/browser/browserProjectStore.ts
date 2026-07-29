import {
  createDefaultChapterMeta,
  createDefaultSettings,
  createDefaultSummary,
  createDefaultWorld
} from '../../../shared/templates.js';
import type { StoryProject } from '../../../shared/types.js';
import { createInitialWorkflowState, workflowStageIds } from '../../../shared/workflowDefaults.js';
import { openBrowserDatabase } from './browserDb.js';

const BACKUP_FORMAT = 'storyforge-browser-project';
const BACKUP_VERSION = 1;
let lastWriteTimestamp = 0;

interface BrowserProjectRecord {
  id: string;
  project: StoryProject;
  updatedAt: string;
}

export interface BrowserProjectBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  project: StoryProject;
}

export interface BrowserProjectStore {
  create(name: string): Promise<StoryProject>;
  list(): Promise<StoryProject[]>;
  load(rootPath: string): Promise<StoryProject>;
  save(project: StoryProject): Promise<void>;
  remove(rootPath: string): Promise<void>;
  exportProject(project: StoryProject): BrowserProjectBackup;
  importProject(value: unknown): Promise<StoryProject>;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function createRootPath(): string {
  return `browser:${crypto.randomUUID()}`;
}

function nextUpdatedAt(): string {
  lastWriteTimestamp = Math.max(Date.now(), lastWriteTimestamp + 1);
  return new Date(lastWriteTimestamp).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string');
}

function isCharacter(value: unknown): boolean {
  return isRecord(value) && ['id', 'name', 'role', 'motivation', 'flaw', 'arc'].every((key) => typeof value[key] === 'string');
}

function isPlotBeat(value: unknown): boolean {
  return isRecord(value) && typeof value.id === 'string' && typeof value.label === 'string' && typeof value.summary === 'string' && Number.isInteger(value.chapterHint);
}

function isChapter(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.meta) || typeof value.content !== 'string') return false;
  const { meta } = value;
  return Number.isInteger(meta.id) && typeof meta.title === 'string' && Number.isInteger(meta.sceneCount) && isStringArray(meta.characters) && isStringArray(meta.locations) && Number.isInteger(meta.timelineDay);
}

function isSummary(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.timeline) || !Array.isArray(value.locations) || !Array.isArray(value.characters)) return false;
  return (
    value.timeline.every((row) => isRecord(row) && typeof row.event === 'string' && typeof row.time === 'string' && Number.isInteger(row.chapter)) &&
    value.locations.every((row) => isRecord(row) && typeof row.name === 'string' && typeof row.firstAppearance === 'string' && isStringArray(row.scenes)) &&
    value.characters.every((row) => isRecord(row) && typeof row.name === 'string' && Number.isInteger(row.firstChapter) && Number.isInteger(row.lastChapter) && typeof row.statusChange === 'string')
  );
}

const workflowStatuses = ['locked', 'draft', 'confirmed', 'regenerating', 'optional'];

function isWorkflowReport(value: unknown): boolean {
  return isRecord(value) && ['passed', 'issues_found'].includes(value.status as string) && typeof value.summary === 'string' && Array.isArray(value.issues) && value.issues.every((issue) => isRecord(issue) && typeof issue.id === 'string' && ['info', 'warning', 'error'].includes(issue.severity as string) && typeof issue.message === 'string' && (issue.location === undefined || typeof issue.location === 'string'));
}

function isWorkflowArtifacts(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const artifacts = value;
  const initialSettingBook = artifacts.initialSettingBook;
  return (
    (initialSettingBook === undefined || (isRecord(initialSettingBook) && ['genre', 'worldPremise', 'protagonist', 'coreConflict', 'readerFeeling', 'targetLength'].every((key) => typeof initialSettingBook[key] === 'string') && isStringArray(initialSettingBook.requiredElements))) &&
    (artifacts.worldOutline === undefined || (isRecord(artifacts.worldOutline) && typeof artifacts.worldOutline.worldDocument === 'string' && typeof artifacts.worldOutline.masterOutline === 'string')) &&
    (artifacts.actTimeline === undefined || (isRecord(artifacts.actTimeline) && Array.isArray(artifacts.actTimeline.acts) && artifacts.actTimeline.acts.every((act) => isRecord(act) && ['id', 'title', 'time', 'location', 'movement', 'summary'].every((key) => typeof act[key] === 'string') && isStringArray(act.characters)))) &&
    (artifacts.sceneOutline === undefined || (isRecord(artifacts.sceneOutline) && Array.isArray(artifacts.sceneOutline.acts) && artifacts.sceneOutline.acts.every((act) => isRecord(act) && typeof act.actId === 'string' && typeof act.summary === 'string' && Array.isArray(act.chapters) && act.chapters.every((chapter) => isRecord(chapter) && typeof chapter.id === 'string' && typeof chapter.actId === 'string' && Number.isInteger(chapter.chapterId) && typeof chapter.target === 'string' && Array.isArray(chapter.scenes) && chapter.scenes.every((scene) => isRecord(scene) && typeof scene.id === 'string' && typeof scene.summary === 'string' && isStringArray(scene.characters) && typeof scene.location === 'string') && Array.isArray(chapter.anchors) && chapter.anchors.every((anchor) => isRecord(anchor) && typeof anchor.id === 'string' && typeof anchor.text === 'string' && typeof anchor.actId === 'string' && (anchor.chapterId === undefined || Number.isInteger(anchor.chapterId))))))) &&
    (artifacts.chapterReviews === undefined || (isRecord(artifacts.chapterReviews) && Object.values(artifacts.chapterReviews).every(isWorkflowReport))) &&
    (artifacts.actScores === undefined || (isRecord(artifacts.actScores) && Object.values(artifacts.actScores).every((score) => isRecord(score) && typeof score.actId === 'string' && ['plotContinuity', 'characterConsistency', 'pacingControl', 'detailRichness'].every((key) => typeof score[key] === 'number') && typeof score.comment === 'string')))
    && (artifacts.fullReview === undefined || isWorkflowReport(artifacts.fullReview))
  );
}

function isWorkflow(value: unknown): boolean {
  if (!isRecord(value) || !workflowStageIds.includes(value.currentStage as typeof workflowStageIds[number]) || !isRecord(value.stages) || !isWorkflowArtifacts(value.artifacts) || !isRecord(value.memory)) return false;
  const stages = value.stages;
  if (!workflowStageIds.every((stage) => isRecord(stages[stage]) && workflowStatuses.includes(stages[stage].status as string) && (stages[stage].confirmedAt === undefined || typeof stages[stage].confirmedAt === 'string') && (stages[stage].regeneratedAt === undefined || typeof stages[stage].regeneratedAt === 'string'))) return false;
  const memory = value.memory;
  return Array.isArray(memory.characterStates) && memory.characterStates.every((state) => isRecord(state) && ['name', 'role', 'status'].every((key) => typeof state[key] === 'string')) && Array.isArray(memory.foreshadowing) && memory.foreshadowing.every((item) => isRecord(item) && typeof item.id === 'string' && typeof item.text === 'string' && ['open', 'echoed', 'resolved'].includes(item.status as string)) && (memory.locationStates === undefined || (Array.isArray(memory.locationStates) && memory.locationStates.every((item) => isRecord(item) && typeof item.name === 'string' && typeof item.status === 'string'))) && (memory.objectStates === undefined || (Array.isArray(memory.objectStates) && memory.objectStates.every((item) => isRecord(item) && typeof item.name === 'string' && typeof item.status === 'string'))) && (memory.activeWorldRules === undefined || isStringArray(memory.activeWorldRules)) && (memory.openConflicts === undefined || isStringArray(memory.openConflicts)) && Array.isArray(memory.recentEvents) && memory.recentEvents.every((item) => isRecord(item) && Number.isInteger(item.chapterId) && typeof item.summary === 'string') && isStringArray(memory.workingMemory);
}

function isStoryProject(value: unknown): value is StoryProject {
  if (!isRecord(value)) return false;

  const { settings, world, characters, plot, chapters, summary, workflow } = value;
  return (
    typeof value.rootPath === 'string' &&
    isRecord(settings) &&
    typeof settings.name === 'string' &&
    typeof settings.createdAt === 'string' &&
    ['low', 'medium', 'high'].includes(settings.reviewStrictness as string) &&
    isRecord(world) &&
    typeof world.genre === 'string' &&
    typeof world.premise === 'string' &&
    isStringArray(world.rules) &&
    isStringRecord(world.terms) &&
    Array.isArray(characters) && characters.every(isCharacter) &&
    Array.isArray(plot) && plot.every(isPlotBeat) &&
    Array.isArray(chapters) && chapters.every(isChapter) &&
    isSummary(summary) &&
    isWorkflow(workflow)
  );
}

function portableProject(project: StoryProject): StoryProject {
  const copyReport = (report: NonNullable<StoryProject['workflow']['artifacts']['fullReview']>) => ({ status: report.status, summary: report.summary, issues: report.issues.map((issue) => issue.location === undefined ? { id: issue.id, severity: issue.severity, message: issue.message } : { id: issue.id, severity: issue.severity, message: issue.message, location: issue.location }) });
  const artifacts = project.workflow.artifacts;
  const portableArtifacts: StoryProject['workflow']['artifacts'] = {};
  if (artifacts.initialSettingBook !== undefined) portableArtifacts.initialSettingBook = { genre: artifacts.initialSettingBook.genre, worldPremise: artifacts.initialSettingBook.worldPremise, protagonist: artifacts.initialSettingBook.protagonist, coreConflict: artifacts.initialSettingBook.coreConflict, readerFeeling: artifacts.initialSettingBook.readerFeeling, targetLength: artifacts.initialSettingBook.targetLength, requiredElements: [...artifacts.initialSettingBook.requiredElements] };
  if (artifacts.worldOutline !== undefined) portableArtifacts.worldOutline = { worldDocument: artifacts.worldOutline.worldDocument, masterOutline: artifacts.worldOutline.masterOutline };
  if (artifacts.actTimeline !== undefined) portableArtifacts.actTimeline = { acts: artifacts.actTimeline.acts.map((act) => ({ id: act.id, title: act.title, time: act.time, location: act.location, characters: [...act.characters], movement: act.movement, summary: act.summary })) };
  if (artifacts.sceneOutline !== undefined) portableArtifacts.sceneOutline = { acts: artifacts.sceneOutline.acts.map((act) => ({ actId: act.actId, summary: act.summary, chapters: act.chapters.map((chapter) => ({ id: chapter.id, actId: chapter.actId, chapterId: chapter.chapterId, target: chapter.target, scenes: chapter.scenes.map((scene) => ({ id: scene.id, summary: scene.summary, characters: [...scene.characters], location: scene.location })), anchors: chapter.anchors.map((anchor) => anchor.chapterId === undefined ? { id: anchor.id, text: anchor.text, actId: anchor.actId } : { id: anchor.id, text: anchor.text, actId: anchor.actId, chapterId: anchor.chapterId }) })) })) };
  if (artifacts.chapterReviews !== undefined) portableArtifacts.chapterReviews = Object.fromEntries(Object.entries(artifacts.chapterReviews).map(([key, report]) => [key, copyReport(report)]));
  if (artifacts.actScores !== undefined) portableArtifacts.actScores = Object.fromEntries(Object.entries(artifacts.actScores).map(([key, score]) => [key, { actId: score.actId, plotContinuity: score.plotContinuity, characterConsistency: score.characterConsistency, pacingControl: score.pacingControl, detailRichness: score.detailRichness, comment: score.comment }]));
  if (artifacts.fullReview !== undefined) portableArtifacts.fullReview = copyReport(artifacts.fullReview);
  const memory = project.workflow.memory;
  const portableMemory: StoryProject['workflow']['memory'] = { characterStates: memory.characterStates.map((state) => ({ name: state.name, role: state.role, status: state.status })), foreshadowing: memory.foreshadowing.map((item) => ({ id: item.id, text: item.text, status: item.status })), recentEvents: memory.recentEvents.map((item) => ({ chapterId: item.chapterId, summary: item.summary })), workingMemory: [...memory.workingMemory] };
  if (memory.locationStates !== undefined) portableMemory.locationStates = memory.locationStates.map((item) => ({ name: item.name, status: item.status }));
  if (memory.objectStates !== undefined) portableMemory.objectStates = memory.objectStates.map((item) => ({ name: item.name, status: item.status }));
  if (memory.activeWorldRules !== undefined) portableMemory.activeWorldRules = [...memory.activeWorldRules];
  if (memory.openConflicts !== undefined) portableMemory.openConflicts = [...memory.openConflicts];

  return {
    rootPath: project.rootPath,
    settings: { name: project.settings.name, createdAt: project.settings.createdAt, reviewStrictness: project.settings.reviewStrictness },
    world: { genre: project.world.genre, premise: project.world.premise, rules: [...project.world.rules], terms: Object.fromEntries(Object.entries(project.world.terms)) },
    characters: project.characters.map((character) => ({ id: character.id, name: character.name, role: character.role, motivation: character.motivation, flaw: character.flaw, arc: character.arc })),
    plot: project.plot.map((beat) => ({ id: beat.id, label: beat.label, summary: beat.summary, chapterHint: beat.chapterHint })),
    chapters: project.chapters.map((chapter) => ({ meta: { id: chapter.meta.id, title: chapter.meta.title, sceneCount: chapter.meta.sceneCount, characters: [...chapter.meta.characters], locations: [...chapter.meta.locations], timelineDay: chapter.meta.timelineDay }, content: chapter.content })),
    summary: {
      timeline: project.summary.timeline.map((row) => ({ event: row.event, time: row.time, chapter: row.chapter })),
      locations: project.summary.locations.map((row) => ({ name: row.name, firstAppearance: row.firstAppearance, scenes: [...row.scenes] })),
      characters: project.summary.characters.map((row) => ({ name: row.name, firstChapter: row.firstChapter, lastChapter: row.lastChapter, statusChange: row.statusChange }))
    },
    workflow: {
      currentStage: project.workflow.currentStage,
      stages: Object.fromEntries(Object.entries(project.workflow.stages).map(([key, stage]) => [key, stage.confirmedAt === undefined && stage.regeneratedAt === undefined ? { status: stage.status } : stage.confirmedAt === undefined ? { status: stage.status, regeneratedAt: stage.regeneratedAt } : stage.regeneratedAt === undefined ? { status: stage.status, confirmedAt: stage.confirmedAt } : { status: stage.status, confirmedAt: stage.confirmedAt, regeneratedAt: stage.regeneratedAt }])) as StoryProject['workflow']['stages'],
      artifacts: portableArtifacts,
      memory: portableMemory
    }
  };
}

export function createBrowserProjectStore(): BrowserProjectStore {
  async function save(project: StoryProject): Promise<void> {
    if (!project.rootPath.startsWith('browser:')) {
      throw new Error('Invalid browser project path');
    }
    if (!isStoryProject(project)) throw new Error('Invalid browser project');

    const database = await openBrowserDatabase();
    const transaction = database.transaction('projects', 'readwrite');
    transaction.objectStore('projects').put({
      id: project.rootPath,
      project: portableProject(project),
      updatedAt: nextUpdatedAt()
    } satisfies BrowserProjectRecord);
    await transactionDone(transaction);
  }

  return {
    async create(name: string): Promise<StoryProject> {
      const displayName = name.trim() || 'Untitled Story';
      const project: StoryProject = {
        rootPath: createRootPath(),
        settings: createDefaultSettings(displayName),
        world: createDefaultWorld(),
        characters: [],
        plot: [],
        chapters: createDefaultChapterMeta().map((meta) => ({ meta, content: '# Chapter 1\n\n' })),
        summary: createDefaultSummary(),
        workflow: createInitialWorkflowState()
      };
      await save(project);
      return project;
    },

    async list(): Promise<StoryProject[]> {
      const database = await openBrowserDatabase();
      const transaction = database.transaction('projects', 'readonly');
      const records = await requestResult(transaction.objectStore('projects').getAll()) as BrowserProjectRecord[];
      await transactionDone(transaction);
      return records.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).map((record) => record.project);
    },

    async load(rootPath: string): Promise<StoryProject> {
      const database = await openBrowserDatabase();
      const transaction = database.transaction('projects', 'readonly');
      const record = await requestResult(transaction.objectStore('projects').get(rootPath)) as BrowserProjectRecord | undefined;
      await transactionDone(transaction);
      if (!record) throw new Error('Browser project not found');
      return record.project;
    },

    save,

    async remove(rootPath: string): Promise<void> {
      const database = await openBrowserDatabase();
      const transaction = database.transaction('projects', 'readwrite');
      transaction.objectStore('projects').delete(rootPath);
      await transactionDone(transaction);
    },

    exportProject(project: StoryProject): BrowserProjectBackup {
      if (!isStoryProject(project)) {
        throw new Error('Invalid browser project');
      }
      return {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        project: portableProject(project)
      };
    },

    async importProject(value: unknown): Promise<StoryProject> {
      if (
        !isRecord(value) ||
        value.format !== BACKUP_FORMAT ||
        value.version !== BACKUP_VERSION ||
        typeof value.exportedAt !== 'string' ||
        !isStoryProject(value.project)
      ) {
        throw new Error('Invalid StoryForge project backup');
      }

      const project = { ...portableProject(value.project), rootPath: createRootPath() };
      await save(project);
      return project;
    }
  };
}
