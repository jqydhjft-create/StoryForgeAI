import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AiConnectionTestResult,
  AiProviderConfigInput,
  AiProviderStatus,
  ChapterReviewReport,
  GeneratedChapterDraft,
  StoryProject,
  SummaryData,
  WorkflowStageId
} from '../shared/types.js';
import { StartScreen } from './components/StartScreen';
import { EditorPane } from './components/EditorPane';
import { AssetContextList } from './components/AssetContextList';
import { AssetTypeRail } from './components/AssetTypeRail';
import { ContextRail } from './components/ContextRail';
import { SettingsDiagnostics } from './components/SettingsDiagnostics';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { WorkspaceShell } from './components/WorkspaceShell';
import { assetTypeForTreeSelection, resolveAssetListCollapsed, type AssetType, type TreeSelection } from './components/workspaceModel';
import { StoryStarter } from './components/StoryStarter';
import { IntakeConfirmation } from './components/IntakeConfirmation';
import type { Language } from './i18n';
import { t } from './i18n';
import { applyEditableDocument, getEditableDocument } from './services/editorDocuments';
import {
  replaceChapterWithDraft,
  appendChapterDraft,
  buildSummaryCacheFile,
  createNewCharacter,
  deleteChapter,
  deleteCharacter
} from './services/projectMutations';
import type { ProjectMutation } from './services/projectMutations';
import { runSummaryWorkflow, upsertChapterSummary } from './services/summaryService';
import { runLightReview, type LiveReviewWarning } from './services/liveReviewService';
import { initialProjectName } from './services/startupDefaults';
import { createBrowserAppService } from './services/browser/browserAppService';
import type { AppService } from './services/appService';
import { createNovelDownload, createProjectBackupDownload, triggerBrowserDownload } from './services/browser/browserDownloads';
import { resolveIntakeScreen } from './services/intakeScreenState';
import { resolveNextWorkflowChapter } from './services/workflowNextChapter';
import {
  buildWorkflowStateFile,
  recordWorkflowChapterReview,
  type WorkflowProjectMutation
} from './services/workflowMutations';
import {
  forceSaveWorkflowChapterDraft,
  type WorkflowChapterDraftResult
} from './services/workflowChapterLoop';
import { persistWorkflowMutationForRequest } from './services/workflowRequestPersistence';
export { reconcileWorkflowProject, reconcileWorkflowProjectForRequest } from './services/workflowProjectReconciliation';

export function startModelRunTicker(onTick: (now: number) => void): () => void {
  onTick(Date.now());
  const timer = setInterval(() => onTick(Date.now()), 1_000);
  return () => clearInterval(timer);
}

export interface AppProps {
  /** Allows the browser service boundary to be exercised without Electron globals. */
  appService?: AppService;
}

export function App({ appService: suppliedAppService }: AppProps = {}) {
  const [language, setLanguage] = useState<Language>('en');
  const [projectName, setProjectName] = useState(initialProjectName);
  const [storyIdea, setStoryIdea] = useState('');
  const [project, setProject] = useState<StoryProject | null>(null);
  const [summary, setSummary] = useState<SummaryData>({ timeline: [], locations: [], characters: [] });
  const [selection, setSelection] = useState<TreeSelection>({ kind: 'world', id: 'bible' });
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [workflowLog, setWorkflowLog] = useState<string[]>([]);
  const [aiConnectionResult, setAiConnectionResult] = useState<AiConnectionTestResult | null>(null);
  const [isSummaryRefreshing, setIsSummaryRefreshing] = useState(false);
  const [isAiTesting, setIsAiTesting] = useState(false);
  const [isAiConfigApplying, setIsAiConfigApplying] = useState(false);
  const [localProjects, setLocalProjects] = useState<StoryProject[]>([]);
  const [isWorkflowBusy, setIsWorkflowBusy] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState('');
  const [workflowIdea, setWorkflowIdea] = useState(initialProjectName);
  const [workspaceAssetType, setWorkspaceAssetType] = useState<AssetType>('chapters');
  const assetListUserChoice = useRef<boolean | null>(null);
  const [assetListCollapsed, setAssetListCollapsed] = useState(() =>
    resolveAssetListCollapsed(typeof window === 'undefined' ? undefined : window.innerWidth, null)
  );
  const [contextRailExpanded, setContextRailExpanded] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelRunStartedAt, setModelRunStartedAt] = useState<number | null>(null);
  const [modelRunStage, setModelRunStage] = useState<WorkflowStageId | null>(null);
  const [modelRunLabel, setModelRunLabel] = useState<string | null>(null);
  const [modelRunOutcome, setModelRunOutcome] = useState<'success' | 'error' | null>(null);
  const [modelRunElapsedSeconds, setModelRunElapsedSeconds] = useState<number | null>(null);
  const [modelRunStatus, setModelRunStatus] = useState('');
  const [modelRunError, setModelRunError] = useState('');
  const [modelRunNow, setModelRunNow] = useState(Date.now());
  const [viewedWorkflowStage, setViewedWorkflowStage] = useState<WorkflowStageId>('intake');
  const [pendingWorkflowChapterDraft, setPendingWorkflowChapterDraft] = useState<WorkflowChapterDraftResult | null>(null);
  const [workflowDrafts, setWorkflowDrafts] = useState<Partial<Record<WorkflowStageId, unknown>>>({});
  const [liveReviewWarnings, setLiveReviewWarnings] = useState<LiveReviewWarning[]>([]);
  const [editorDirty, setEditorDirty] = useState(false);
  const [aiConfigDraft, setAiConfigDraft] = useState<AiProviderConfigInput>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-5.6',
    baseUrl: 'https://api.openai.com/v1'
  });
  const [aiStatus, setAiStatus] = useState<AiProviderStatus>({
    configured: false,
    provider: 'mock',
    model: 'mock',
    baseUrl: ''
  });

  const appService = useMemo(() => suppliedAppService ?? createBrowserAppService(), [suppliedAppService]);
  const projectRef = useRef<StoryProject | null>(null);
  const modelRunStartedAtRef = useRef<number | null>(null);
  const getWorkflowService = useCallback(() => appService.createWorkflowService(), [appService]);
  const activeDocument = project ? getEditableDocument(project, selection) : null;
  const onEditorDirtyChange = useCallback((dirty: boolean) => setEditorDirty(dirty), []);
  const aiConfigFields = aiConfigDraft;
  const replaceProject = useCallback((nextProject: StoryProject) => {
    projectRef.current = nextProject;
    setProject(nextProject);
  }, []);
  const clearModelRun = useCallback(() => {
    setModelRunStartedAt(null);
    setModelRunStage(null);
    setModelRunLabel(null);
    setModelRunOutcome(null);
    setModelRunElapsedSeconds(null);
    modelRunStartedAtRef.current = null;
    setModelRunStatus('');
    setModelRunError('');
  }, []);
  const beginModelRun = useCallback((stage: WorkflowStageId | null, label: string | null, statusText: string) => {
    const startedAt = Date.now();
    modelRunStartedAtRef.current = startedAt;
    setModelRunStartedAt(startedAt);
    setModelRunStage(stage);
    setModelRunLabel(label);
    setModelRunStatus(statusText);
    setModelRunError('');
    setModelRunOutcome(null);
    setModelRunElapsedSeconds(null);
  }, []);
  const finishModelRun = useCallback((outcome: 'success' | 'error', statusText?: string, errorText?: string) => {
    const startedAt = modelRunStartedAtRef.current;
    setModelRunElapsedSeconds(startedAt === null ? 0 : Math.max(0, Math.floor((Date.now() - startedAt) / 1_000)));
    setModelRunOutcome(outcome);
    if (statusText !== undefined) setModelRunStatus(statusText);
    if (errorText !== undefined) setModelRunError(errorText);
  }, []);

  useEffect(() => {
    if (modelRunStartedAt === null || (!isWorkflowBusy && !isSummaryRefreshing)) return;
    return startModelRunTicker(setModelRunNow);
  }, [isSummaryRefreshing, isWorkflowBusy, modelRunStartedAt]);

  useEffect(() => {
    const syncAssetListPresentation = () => {
      if (assetListUserChoice.current === null) {
        setAssetListCollapsed(resolveAssetListCollapsed(window.innerWidth, null));
      }
    };
    window.addEventListener('resize', syncAssetListPresentation);
    return () => window.removeEventListener('resize', syncAssetListPresentation);
  }, []);

  async function generateAiSeed(): Promise<string> {
    const runner = (() => null)() as ((request: Record<string, unknown>) => Promise<{ output: unknown }>) | null;

    const fallbacks = language === 'zh-CN'
      ? ['一个被宗门逐出的废材，在悬崖底捡到会说话的骨头。', '重生回到高考前三天，她决定不再为别人活。', '末日废墟里捡到的婴儿，眼睛里燃烧着金色火焰。']
      : ['A disgraced knight finds a child with glowing eyes in the ruins.', 'She wakes up three days before the apocalypse with memories of the future.', 'The last librarian in a world where books are illegal receives a mysterious shipment.'];

    if (!runner) {
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    const systemPrompt = language === 'zh-CN'
      ? '你是一个创意素材生成器。按以下两步流程生成一个新的素材单元：\n\n第一步：提出一个思辨性/两难问题。这个问题应具有多重解读维度，不预设情景，保持开放，不给出明确的价值判断。\n\n第二步：以这个问题为支点，写一个故事。故事中不能直接提到问题本身，但必须体现：角色A面临生死或重大抉择，在情境与压力下做出的选择能作为一种对这个问题的回答。故事简洁，不做过多的环境或心理修饰。'
      : 'You are a creative material generator. Follow this two-step process:\n\nStep 1: Pose a speculative or dilemma question with multiple interpretative dimensions. Do not preset a scenario. Keep the question open without explicit value judgment.\n\nStep 2: Using this question as a fulcrum, write a story. The story must not mention the question directly, but must show Character A facing a life-or-death or major choice, where their decision under pressure serves as an answer to the question. Keep the story concise.';

    const userPrompt = language === 'zh-CN'
      ? '请生成一个新的素材单元，以 JSON 格式返回。'
      : 'Generate a new material unit. Return as JSON.';

    try {
      const response = await runner({
        skillId: 'summary-ai',
        systemPrompt,
        userPrompt,
        repairPrompt: language === 'zh-CN'
          ? '只返回一个 JSON 对象，字段为 worldSetting（一句话世界观）和 storySynopsis（故事简介）。不要代码块、不要解释。'
          : 'Return only a JSON object with fields worldSetting (world setting in one sentence) and storySynopsis (story synopsis). No code blocks, no extra text.',
        outputSchema: '{ "worldSetting": "string", "storySynopsis": "string" }',
        schemaHint: 'world setting and story synopsis',
        exampleInput: '{}',
        exampleOutput: JSON.stringify({
          worldSetting: '一个所有记忆都可以被交易的近未来城市。',
          storySynopsis: '一名破产的记忆商人收到一份订单——购买他自己的童年记忆，而卖家署名是他已经去世的女儿。'
        })
      });

      const output = response.output;
      if (output && typeof output === 'object' && !Array.isArray(output)) {
        const obj = output as Record<string, unknown>;
        const world = typeof obj.worldSetting === 'string' ? obj.worldSetting : '';
        const synopsis = typeof obj.storySynopsis === 'string' ? obj.storySynopsis : '';
        if (world && synopsis) {
          return `世界观：${world}\n故事简介：${synopsis}`;
        }
      }
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    } catch {
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
  }

  async function startWorkflowFromIdea() {
    if (!project || !storyIdea.trim() || isWorkflowBusy) return;
    setIsWorkflowBusy(true);
    setError('');
    setWorkflowStatus('生成创作简报...');
    try {
      beginModelRun('intake', null, 'Generating creative brief');
      const artifact = await (await getWorkflowService()).generateStage(project, 'intake', storyIdea.trim());
      setWorkflowDrafts((current) => ({ ...current, intake: artifact }));
      setWorkflowIdea(storyIdea.trim());
      setWorkflowStatus(t(language, 'assistant.draftReady'));
      finishModelRun('success', t(language, 'assistant.draftReady'));
    } catch (event) {
      const message = event instanceof Error ? event.message : String(event);
      setWorkflowStatus('');
      setModelRunError(message);
      finishModelRun('error', undefined, message);
      setError(message);
      console.error('流水线失败:', event);
    } finally {
      setIsWorkflowBusy(false);
    }
  }

  function workflowArtifactForStage(stage: WorkflowStageId, sourceProject = project): unknown {
    if (!sourceProject) return undefined;
    const artifacts = sourceProject.workflow.artifacts;

    switch (stage) {
      case 'intake':
        return artifacts.initialSettingBook;
      case 'world_outline':
        return artifacts.worldOutline;
      case 'character_bible':
        return artifacts.characterBible;
      case 'act_timeline':
        return artifacts.actTimeline;
      case 'scene_outline':
        return artifacts.sceneOutline;
      case 'act_scoring': {
        const actId = sourceProject.workflow.artifacts.actTimeline?.acts[0]?.id;
        return actId ? artifacts.actScores?.[actId] : artifacts.actScores;
      }
      case 'full_review':
        return artifacts.fullReview;
      case 'chapter_draft':
        return pendingWorkflowChapterDraft ?? artifacts.chapterReviews;
      default:
        return undefined;
    }
  }

  function asWorkflowChapterDraft(value: unknown): GeneratedChapterDraft | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const chapter = value as { meta?: Partial<GeneratedChapterDraft['meta']>; content?: unknown };
    const meta = chapter.meta;
    if (!meta || typeof chapter.content !== 'string') return null;
    if (
      typeof meta.id !== 'number' ||
      typeof meta.title !== 'string' ||
      typeof meta.sceneCount !== 'number' ||
      !Array.isArray(meta.characters) ||
      !meta.characters.every((item) => typeof item === 'string') ||
      !Array.isArray(meta.locations) ||
      !meta.locations.every((item) => typeof item === 'string') ||
      typeof meta.timelineDay !== 'number'
    ) {
      return null;
    }

    return {
      meta: {
        id: meta.id,
        title: meta.title,
        sceneCount: meta.sceneCount,
        characters: meta.characters,
        locations: meta.locations,
        timelineDay: meta.timelineDay
      },
      content: chapter.content
    };
  }

  async function applyWorkflowProjectMutation(result: WorkflowProjectMutation, requestProject: StoryProject, stage: WorkflowStageId) {
    try {
      const latestReconciledProject = await persistWorkflowMutationForRequest(result, requestProject, stage, {
        currentProject: () => projectRef.current,
        saveProject: appService.saveProject,
        replaceProject
      });
      if (!latestReconciledProject) return;
      setViewedWorkflowStage(latestReconciledProject.workflow.currentStage);
      setWorkflowStatus(t(language, 'editor.saved'));
      finishModelRun('success', t(language, 'editor.saved'));
      setSaveStatus(t(language, 'editor.saved'));
    } catch (event) {
      setSaveStatus(t(language, 'editor.saveFailed'));
      setError(event instanceof Error ? event.message : t(language, 'editor.saveFailed'));
    }
  }

  useEffect(() => {
    setSaveStatus('');
    setPendingWorkflowChapterDraft(null);
  }, [selection.kind, selection.id, language]);

  useEffect(() => {
    setExportStatus('');
  }, [language, project?.rootPath]);

  useEffect(() => {
    setWorkflowStatus('');
  }, [language, project?.rootPath]);

  useEffect(() => {
    void (async () => {
      try {
        const [projects, saved] = await Promise.all([appService.listProjects(), appService.loadAiConfig()]);
        setLocalProjects(projects);
        if (saved) setAiConfigDraft({ ...saved, apiKey: '' });
        setAiStatus(await appService.getAiStatus());
      } catch {
        setAiStatus({ configured: false, provider: 'mock', model: 'mock', baseUrl: '' });
      }
    })();
  }, [appService]);

  async function createLocalProject() {
    setError('');

    try {
        const createdProject = await appService.createProject(projectName);
        setLocalProjects(await appService.listProjects());
        replaceProject(createdProject);
        setSummary(createdProject.summary);
        setWorkflowLog([]);
        setPendingWorkflowChapterDraft(null);
        setWorkflowDrafts({});
        setWorkflowStatus('');
        setLiveReviewWarnings([]);
        setSelection({ kind: 'chapter', id: String(createdProject.chapters[0]?.meta.id ?? 1) });
        setWorkspaceAssetType('chapters');
        setViewedWorkflowStage(createdProject.workflow.currentStage);
        clearModelRun();
    } catch (event) {
      setError(event instanceof Error ? event.message : t(language, 'error.createProject'));
    }
  }

  async function openProject(rootPath: string) {
    setError('');

    try {
        const loadedProject = await appService.loadProject(rootPath);
        replaceProject(loadedProject);
        setSummary(loadedProject.summary);
        setWorkflowLog([]);
        setPendingWorkflowChapterDraft(null);
        setWorkflowDrafts({});
        setWorkflowStatus('');
        setWorkflowIdea(loadedProject.workflow.artifacts.initialSettingBook?.worldPremise ?? loadedProject.settings.name);
        setLiveReviewWarnings(await runLightReview(loadedProject));
        setSelection({ kind: 'chapter', id: String(loadedProject.chapters[0]?.meta.id ?? 1) });
        setWorkspaceAssetType('chapters');
        setViewedWorkflowStage(loadedProject.workflow.currentStage);
        clearModelRun();
    } catch (event) {
      setError(event instanceof Error ? event.message : t(language, 'error.openProject'));
    }
  }

  async function saveActiveDocument(content: string) {
    if (!project || !activeDocument) return;
    if (activeDocument.readOnly) return;

    try {
      const nextProject = applyEditableDocument(project, selection, content);
      const savedProject =
        selection.kind === 'chapter'
          ? {
              ...nextProject,
              summary: upsertChapterSummary(
                nextProject.summary,
                nextProject.chapters.find((chapter) => String(chapter.meta.id) === selection.id) ?? project.chapters[0]
              )
            }
          : nextProject;
      await appService.saveProject(savedProject);
      replaceProject(savedProject);
      setSummary(savedProject.summary);
      setLiveReviewWarnings(await runLightReview(savedProject));
      setSaveStatus(t(language, 'editor.saved'));
    } catch (event) {
      setSaveStatus(t(language, 'editor.saveFailed'));
      setError(event instanceof Error ? event.message : t(language, 'editor.saveFailed'));
    }
  }

  async function applyProjectMutation(result: ProjectMutation) {
    try {
      await appService.saveProject(result.project);
      replaceProject(result.project);
      setSummary(result.project.summary);
      setSelection(result.selection);
      setLiveReviewWarnings(await runLightReview(result.project));
      setSaveStatus(t(language, 'editor.saved'));
    } catch (event) {
      setSaveStatus(t(language, 'editor.saveFailed'));
      setError(event instanceof Error ? event.message : t(language, 'editor.saveFailed'));
    }
  }

  async function generateWorkflowStage(stage: WorkflowStageId) {
    if (!project || isWorkflowBusy) return;
    setError('');
    if (stage === 'chapter_draft') {
      await generateWorkflowPanelChapter();
      return;
    }

    setIsWorkflowBusy(true);
    setWorkflowStatus('');
    try {
      beginModelRun(stage, null, 'Generating workflow artifact');
      const workflowService = await getWorkflowService();
      const artifact = await workflowService.generateStage(project, stage, workflowIdea);
      if (stage === 'act_scoring') {
        await applyWorkflowProjectMutation(workflowService.confirmStage(project, stage, artifact), project, stage);
        return;
      }
      if (stage === 'full_review') {
        const workflow = {
          ...project.workflow,
          artifacts: { ...project.workflow.artifacts, fullReview: artifact as ChapterReviewReport }
        };
        await applyWorkflowProjectMutation({
          project: { ...project, workflow },
          files: [buildWorkflowStateFile(workflow)]
        }, project, stage);
        return;
      }
      setWorkflowDrafts((current) => ({ ...current, [stage]: artifact }));
      setWorkflowStatus(t(language, 'assistant.draftReady'));
      finishModelRun('success', t(language, 'assistant.draftReady'));
    } catch (event) {
      const message = event instanceof Error ? event.message : t(language, 'assistant.seedFailed');
      setWorkflowStatus(message);
      setModelRunError(message);
      finishModelRun('error', undefined, message);
      setError(message);
    } finally {
      setIsWorkflowBusy(false);
    }
  }

  async function confirmCurrentWorkflowStage(stage: WorkflowStageId) {
    if (!project || isWorkflowBusy) return;
    setError('');
    if (stage === 'chapter_draft') {
      await savePendingWorkflowChapter(false);
      return;
    }

    const artifact = workflowDrafts[stage] ?? workflowArtifactForStage(stage);
    if (!artifact) {
      setWorkflowStatus(t(language, 'assistant.seedFailed'));
      return;
    }

    await applyWorkflowProjectMutation((await getWorkflowService()).confirmStage(project, stage, artifact), project, stage);
    setWorkflowDrafts((current) => {
      const next = { ...current };
      delete next[stage];
      return next;
    });
  }

  async function regenerateWorkflowStage(stage: WorkflowStageId) {
    if (!project || isWorkflowBusy) return;
    setError('');
    setWorkflowDrafts((current) => {
      const next = { ...current };
      delete next[stage];
      return next;
    });
    setPendingWorkflowChapterDraft(null);
    if (stage === 'chapter_draft') {
      await generateWorkflowPanelChapter();
      return;
    }
    const workflowService = await getWorkflowService();
    await applyWorkflowProjectMutation(workflowService.regenerateStage(project, stage), project, stage);
  }

  async function generateWorkflowPanelChapter() {
    if (!project || isWorkflowBusy) return;
    setError('');

    const target = resolveNextWorkflowChapter(project);
    if (target.status === 'conflict') {
      const message = `${t(language, 'workflow.chapterConflict')} ${target.chapterId}`;
      setWorkflowStatus(message);
      setError(message);
      return;
    }
    if (target.status === 'unavailable') {
      const message = t(
        language,
        target.reason === 'complete'
          ? 'workflow.chapterDraftingComplete'
          : 'workflow.chapterOutlineMissing'
      );
      setWorkflowStatus(message);
      if (target.reason === 'missing_outline') setError(message);
      return;
    }

    setIsWorkflowBusy(true);
    setWorkflowStatus('生成中...');
    try {
      beginModelRun('chapter_draft', null, 'Generating chapter draft');
      const workflowService = await getWorkflowService();
      const draft = await workflowService.generateChapter(project, target.actId, target.chapterId);
      setPendingWorkflowChapterDraft(draft);
      finishModelRun('success', draft.saveDecision === 'blocked_by_review'
        ? `Chapter draft ready; review: ${draft.review.summary}`
        : 'Chapter draft ready');
      if (draft.saveDecision === 'blocked_by_review') {
        setWorkflowStatus(`已生成（审查: ${draft.review.summary}）`);
      } else {
        setWorkflowStatus('已生成 ✓');
      }
    } catch (event) {
      const message = event instanceof Error ? event.message : t(language, 'assistant.nextChapterFailed');
      setWorkflowStatus(message);
      setModelRunError(message);
      finishModelRun('error', undefined, message);
      setError(message);
    } finally {
      setIsWorkflowBusy(false);
    }
  }

  async function savePendingWorkflowChapter(force: boolean) {
    if (!project || !pendingWorkflowChapterDraft) return;
    setError('');
    if (pendingWorkflowChapterDraft.saveDecision === 'blocked_by_review' && !force) {
      setWorkflowStatus(t(language, 'workflow.reviewBlocked'));
      return;
    }
    if (force && !forceSaveWorkflowChapterDraft({ secondConfirmation: window.confirm(t(language, 'workflow.forceSave')) }).allowed) {
      return;
    }

    const chapter = asWorkflowChapterDraft(pendingWorkflowChapterDraft.chapter);
    if (!chapter) {
      setWorkflowStatus(t(language, 'assistant.nextChapterFailed'));
      return;
    }
    const chapterMutation = project.chapters.some((item) => item.meta.id === chapter.meta.id)
      ? replaceChapterWithDraft(project, chapter)
      : appendChapterDraft(project, chapter);
    const reviewMutation = recordWorkflowChapterReview(chapterMutation.project, chapter.meta.id, pendingWorkflowChapterDraft.review);

    setPendingWorkflowChapterDraft(null);
    await applyProjectMutation({
      ...chapterMutation,
      project: reviewMutation.project,
      files: [...chapterMutation.files, ...reviewMutation.files]
    });
    setWorkflowStatus(t(language, 'editor.saved'));
  }

  async function addChapter() {
    if (!project) return;
    await generateWorkflowPanelChapter();
  }

  async function addCharacter() {
    if (!project) return;
    await applyProjectMutation(createNewCharacter(project));
  }

  async function deleteSelectedCharacter() {
    if (!project || selection.kind !== 'character') return;
    await applyProjectMutation(deleteCharacter(project, selection.id));
  }

  async function deleteSelectedChapter() {
    if (!project || selection.kind !== 'chapter') return;
    await applyProjectMutation(deleteChapter(project, Number(selection.id)));
  }

  async function refreshSummary() {
    if (!project || isSummaryRefreshing) return;

    setIsSummaryRefreshing(true);
    try {
      beginModelRun(null, 'Summary', 'Refreshing summary');
      const summaryWorkflow = await runSummaryWorkflow(project.chapters);
      const nextSummary = summaryWorkflow.summary;
      const nextProject = { ...project, summary: nextSummary };
      await appService.saveProject(nextProject);
      replaceProject(nextProject);
      finishModelRun('success', 'Summary ready');
      setSummary(nextSummary);
      setWorkflowLog((current) => [...current, ...summaryWorkflow.changeLog]);
      setSaveStatus(t(language, 'editor.saved'));
    } catch (event) {
      setSaveStatus(t(language, 'editor.saveFailed'));
      setError(event instanceof Error ? event.message : t(language, 'editor.saveFailed'));
    } finally {
      setIsSummaryRefreshing(false);
    }
  }

  async function writeExports() {
    if (!project) return;

    setError('');
    try {
      triggerBrowserDownload(createNovelDownload(project));
      setExportStatus(t(language, 'assistant.exportsReady'));
    } catch (event) {
      setExportStatus(t(language, 'assistant.exportFailed'));
      setError(event instanceof Error ? event.message : t(language, 'assistant.exportFailed'));
    }
  }

  function downloadProjectBackup() {
    if (!project) return;
    triggerBrowserDownload(createProjectBackupDownload(appService.exportProject(project)));
  }

  async function testAiConnection() {
    if (isAiTesting || isAiConfigApplying) return;

    setIsAiTesting(true);
    try {
      setAiConnectionResult({ ok: false, provider: aiStatus.provider, model: aiStatus.model, message: t(language, 'assistant.testingAi') });
      const result = await appService.testAiConnection();
      setAiConnectionResult(result);
      const status = await appService.getAiStatus();
      setAiStatus(status);
    } catch (event) {
      setAiConnectionResult({
        ok: false,
        provider: aiStatus.provider,
        model: aiStatus.model,
        message: event instanceof Error ? event.message : t(language, 'app.modelConnectionFailed')
      });
    } finally {
      setIsAiTesting(false);
    }
  }

  async function applyAiConfig() {
    if (isAiConfigApplying || isAiTesting) return;

    setIsAiConfigApplying(true);
    try {
      await appService.saveAiConfig(aiConfigDraft);
      const status = await appService.getAiStatus();
      setAiStatus(status);
      setAiConnectionResult({
        ok: status.configured,
        provider: status.provider,
        model: status.model,
        message: status.configured ? t(language, 'app.sessionAiConfigApplied') : t(language, 'app.apiKeyRequired')
      });
      setAiConfigDraft({ ...aiConfigDraft, apiKey: '' });
    } catch (event) {
      setAiConnectionResult({
        ok: false,
        provider: aiConfigDraft.provider,
        model: aiConfigDraft.model,
        message: event instanceof Error ? event.message : t(language, 'app.unableToApplyAiConfig')
      });
    } finally {
      setIsAiConfigApplying(false);
    }
  }

  if (!project) {
    return (
      <StartScreen
        language={language}
        onLanguageChange={setLanguage}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        storyIdea={storyIdea}
        onStoryIdeaChange={setStoryIdea}
        onCreateProject={createLocalProject}
        error={error}
        localProjects={localProjects}
        onOpenLocalProject={(rootPath) => void openProject(rootPath)}
        onImportProject={async (file) => {
          const imported = await appService.importProject(JSON.parse(await file.text()));
          setLocalProjects(await appService.listProjects());
          await openProject(imported.rootPath);
        }}
        onDeleteLocalProject={async (rootPath) => {
          await appService.removeProject(rootPath);
          setLocalProjects(await appService.listProjects());
        }}
      />
    );
  }

  const intakeScreen = resolveIntakeScreen({
    persistedArtifact: project.workflow.artifacts.initialSettingBook,
    draft: workflowDrafts.intake
  });

  if (intakeScreen === 'starter') {
    return (
      <main className="workspace">
        <StoryStarter
          language={language}
          initialIdea={storyIdea}
          isBusy={isWorkflowBusy}
          statusText={workflowStatus}
          error={error}
          aiStatus={aiStatus}
          aiConnectionResult={aiConnectionResult}
          aiConfigDraft={aiConfigFields}
          isAiTesting={isAiTesting}
          isAiConfigApplying={isAiConfigApplying}
          onIdeaChange={setStoryIdea}
          onRandomSeed={generateAiSeed}
          onStartWorkflow={() => void startWorkflowFromIdea()}
          onAiConfigDraftChange={(fields) => setAiConfigDraft((current) => ({ ...current, ...fields }))}
          onApiKeyChange={(apiKey) => setAiConfigDraft((current) => ({ ...current, apiKey }))}
          onApplyAiConfig={applyAiConfig}
          onTestAiConnection={testAiConnection}
          onClearApiKey={() => void clearAiConfig()}
        />
      </main>
    );
  }

  if (intakeScreen === 'confirm') {
    return (
      <main className="workspace">
        <IntakeConfirmation
          language={language}
          idea={workflowIdea}
          draft={workflowDrafts.intake}
          isBusy={isWorkflowBusy}
          statusText={workflowStatus}
          error={error}
          onConfirm={() => void confirmCurrentWorkflowStage('intake')}
          onRegenerate={() => void startWorkflowFromIdea()}
          onEditIdea={() => {
            setWorkflowDrafts((drafts) => {
              const next = { ...drafts };
              delete next.intake;
              return next;
            });
            setWorkflowStatus('');
            setError('');
          }}
        />
      </main>
    );
  }

  if (settingsOpen) {
    return (
      <SettingsDiagnostics
        language={language}
        aiStatus={aiStatus}
        aiConnectionResult={aiConnectionResult}
        aiConfigDraft={aiConfigFields}
        isAiTesting={isAiTesting}
        isAiConfigApplying={isAiConfigApplying}
        onAiConfigDraftChange={(fields) => setAiConfigDraft((current) => ({ ...current, ...fields }))}
        onApiKeyChange={(apiKey) => setAiConfigDraft((current) => ({ ...current, apiKey }))}
        onApplyAiConfig={applyAiConfig}
        onTestAiConnection={testAiConnection}
        onClearApiKey={() => void clearAiConfig()}
        workflowLog={workflowLog}
        showBenchmark={false}
        onBack={() => setSettingsOpen(false)}
      />
    );
  }

  function handleAssetTypeChange(assetType: AssetType) {
    setWorkspaceAssetType(assetType);
    if (assetType === 'summary') {
      setSelection({ kind: 'summary', id: 'summary' });
    }
    if (assetType === 'export') {
      setSelection({ kind: 'export', id: 'export' });
    }
  }

  async function clearAiConfig() {
    if (isAiConfigApplying || isAiTesting) return;
    try {
      await appService.clearAiConfig();
      setAiConfigDraft((current) => ({ ...current, apiKey: '' }));
      setAiStatus(await appService.getAiStatus());
      setAiConnectionResult(null);
    } catch (event) {
      setAiConnectionResult({
        ok: false,
        provider: aiStatus.provider,
        model: aiStatus.model,
        message: event instanceof Error ? event.message : t(language, 'app.unableToClearApiKey')
      });
    }
  }

  const selectAsset = (nextSelection: TreeSelection) => {
    setSelection(nextSelection);
    setWorkspaceAssetType(assetTypeForTreeSelection(nextSelection));
  };

  const workspaceEditor = selection.kind === 'export' ? (
    <section className="workspace-export" aria-label="Project export">
      <h2>Export project</h2>
      <p>{exportStatus}</p>
      <button type="button" className="primary" onClick={() => void writeExports()}>Download novel TXT</button>
      <button type="button" onClick={downloadProjectBackup}>Download project backup</button>
    </section>
  ) : (
    <>
      <div className="workspace-content-actions">
        {selection.kind === 'summary' ? (
          <button type="button" onClick={() => void refreshSummary()} disabled={isSummaryRefreshing}>
            {isSummaryRefreshing ? 'Refreshing summary…' : 'Refresh summary'}
          </button>
        ) : null}
        {selection.kind === 'character' ? <button type="button" onClick={() => void deleteSelectedCharacter()}>Delete character</button> : null}
        {selection.kind === 'chapter' ? <button type="button" onClick={() => void deleteSelectedChapter()}>Delete chapter</button> : null}
        <button type="button" onClick={() => void addCharacter()}>Add character</button>
        <button type="button" onClick={() => void addChapter()}>Add chapter</button>
      </div>
      <EditorPane
        language={language}
        document={activeDocument}
        selection={selection}
        saveStatus={saveStatus}
        onSave={saveActiveDocument}
        onDirtyChange={onEditorDirtyChange}
        onGenerateChapter={generateWorkflowPanelChapter}
        canGenerateChapter={selection.kind === 'chapter'}
      />
    </>
  );

  return (
    <WorkspaceShell
      assetType={workspaceAssetType}
      assetListCollapsed={assetListCollapsed}
      contextRailExpanded={contextRailExpanded}
      onAssetTypeChange={handleAssetTypeChange}
      onToggleAssetList={() => setAssetListCollapsed((current) => {
        const next = !current;
        assetListUserChoice.current = next;
        return next;
      })}
      onToggleContextRail={() => setContextRailExpanded((current) => !current)}
      header={(
        <WorkspaceHeader
          language={language}
          projectName={project.settings.name}
          workflow={project.workflow}
          viewedStage={viewedWorkflowStage}
          onViewStage={setViewedWorkflowStage}
          onOpenDiagnostics={() => setSettingsOpen(true)}
        />
      )}
      assetTypeRail={({ assetType, onAssetTypeChange }) => (
        <AssetTypeRail language={language} assetType={assetType} onChange={onAssetTypeChange} />
      )}
      assetContextList={({ assetType, assetListCollapsed: collapsed, onToggleAssetList }) => (
        <AssetContextList
          language={language}
          project={project}
          assetType={assetType}
          selection={selection}
          collapsed={collapsed}
          onSelect={selectAsset}
          onToggleCollapsed={onToggleAssetList}
        />
      )}
      editor={workspaceEditor}
      contextRail={({ contextRailExpanded: expanded, onToggleContextRail }) => (
        <ContextRail
          language={language}
          workflow={project.workflow}
          drafts={workflowDrafts}
          pendingChapterDraft={pendingWorkflowChapterDraft}
          viewedStage={viewedWorkflowStage}
          expanded={expanded}
          isBusy={isWorkflowBusy || isSummaryRefreshing}
          statusText={modelRunStatus}
          errorText={modelRunError}
          startedAt={modelRunStartedAt}
          runStage={modelRunStage}
          runLabel={modelRunLabel}
          runOutcome={modelRunOutcome}
          completedElapsedSeconds={modelRunElapsedSeconds}
          now={modelRunNow}
          onGenerateStage={(stage) => void generateWorkflowStage(stage)}
          onConfirmStage={(stage) => void confirmCurrentWorkflowStage(stage)}
          onRegenerateStage={(stage) => void regenerateWorkflowStage(stage)}
          onForceSaveChapter={() => void savePendingWorkflowChapter(true)}
          onReturnCurrent={() => setViewedWorkflowStage(project.workflow.currentStage)}
          onRetry={() => void generateWorkflowStage(modelRunStage ?? project.workflow.currentStage)}
          onToggle={onToggleContextRail}
        />
      )}
    />
  );
}
