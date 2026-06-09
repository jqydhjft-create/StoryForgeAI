import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AiConnectionTestResult,
  AiProviderConfigInput,
  AiProviderStatus,
  ProjectFileWrite,
  StoryProject,
  SummaryData
} from '../shared/types.js';
import { StartScreen } from './components/StartScreen';
import { ProjectTree, type TreeSelection } from './components/ProjectTree';
import { EditorPane } from './components/EditorPane';
import { AssistantPanel } from './components/AssistantPanel';
import type { Language } from './i18n';
import { t } from './i18n';
import { applyEditableDocument, getEditableDocument } from './services/editorDocuments';
import { writeProjectExports } from './services/exportService';
import { runStoryWorkflow, type StoryWorkflowResult, type WorkflowGateReport } from './services/storyWorkflow';
import {
  applyStoryWorkflowToProject,
  applyNextChapterToProject,
  replaceChapterWithDraft,
  buildSummaryCacheFile,
  createNewCharacter,
  createNextChapter,
  deleteChapter,
  deleteCharacter
} from './services/projectMutations';
import { runSummaryWorkflow, upsertChapterSummary } from './services/summaryService';
import { runNextChapterWorkflow } from './services/nextChapterWorkflow';
import type { NextChapterWorkflowResult } from './services/nextChapterWorkflow';
import { runLightReview, type LiveReviewWarning } from './services/liveReviewService';
import { initialProjectName } from './services/startupDefaults';

export function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [projectName, setProjectName] = useState(initialProjectName);
  const [project, setProject] = useState<StoryProject | null>(null);
  const [summary, setSummary] = useState<SummaryData>({ timeline: [], locations: [], characters: [] });
  const [selection, setSelection] = useState<TreeSelection>({ kind: 'world', id: 'bible' });
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [gateReports, setGateReports] = useState<WorkflowGateReport[]>([]);
  const [workflowLog, setWorkflowLog] = useState<string[]>([]);
  const [aiConnectionResult, setAiConnectionResult] = useState<AiConnectionTestResult | null>(null);
  const [isSummaryRefreshing, setIsSummaryRefreshing] = useState(false);
  const [isAiTesting, setIsAiTesting] = useState(false);
  const [isAiConfigApplying, setIsAiConfigApplying] = useState(false);
  const [isFailedGateRetrying, setIsFailedGateRetrying] = useState(false);
  const [isNextChapterGenerating, setIsNextChapterGenerating] = useState(false);
  const [lastWorkflowIdea, setLastWorkflowIdea] = useState<string | null>(null);
  const [nextChapterStatus, setNextChapterStatus] = useState('');
  const [nextChapterNotes, setNextChapterNotes] = useState<string[]>([]);
  const [assistantCollapsed, setAssistantCollapsed] = useState(false);
  const [pendingStoryDraft, setPendingStoryDraft] = useState<StoryWorkflowResult | null>(null);
  const [pendingChapterDraft, setPendingChapterDraft] = useState<NextChapterWorkflowResult | null>(null);
  const [liveReviewWarnings, setLiveReviewWarnings] = useState<LiveReviewWarning[]>([]);
  const [editorDirty, setEditorDirty] = useState(false);
  const [chapterHistory, setChapterHistory] = useState<Record<string, StoryProject['chapters']>>({});
  const [aiConfigDraft, setAiConfigDraft] = useState<AiProviderConfigInput>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1'
  });
  const [aiStatus, setAiStatus] = useState<AiProviderStatus>({
    configured: false,
    provider: 'mock',
    model: 'mock',
    baseUrl: ''
  });

  const canUseDesktopApi = useMemo(() => Boolean(window.storyforge), []);
  const activeDocument = project ? getEditableDocument(project, selection) : null;
  const focusedChapterTitle =
    project && selection.kind === 'chapter'
      ? project.chapters.find((chapter) => String(chapter.meta.id) === selection.id)?.meta.title ?? ''
      : '';
  const onEditorDirtyChange = useCallback((dirty: boolean) => setEditorDirty(dirty), []);

  async function saveProjectFiles(projectPath: string, files: ProjectFileWrite[]) {
    for (const file of files) {
      await window.storyforge.saveProjectFile(projectPath, file.relativePath, file.content);
    }
  }

  async function deleteProjectFiles(projectPath: string, relativePaths: string[]) {
    for (const relativePath of relativePaths) {
      const characterMatch = /^characters\/([a-z0-9-]+)\.json$/i.exec(relativePath);
      if (characterMatch) {
        await window.storyforge.deleteCharacterFile(projectPath, characterMatch[1]);
        continue;
      }
      const chapterMatch = /^chapters\/(\d+)\.md$/i.exec(relativePath);
      if (chapterMatch) {
        await window.storyforge.deleteChapterFile(projectPath, Number(chapterMatch[1]));
      }
    }
  }

  useEffect(() => {
    setSaveStatus('');
    setPendingChapterDraft(null);
    setNextChapterNotes([]);
    setNextChapterStatus('');
  }, [selection.kind, selection.id, language]);

  useEffect(() => {
    setExportStatus('');
  }, [language, project?.rootPath]);

  useEffect(() => {
    setNextChapterStatus('');
  }, [language, project?.rootPath]);

  useEffect(() => {
    if (!canUseDesktopApi || !window.storyforge.getAiStatus) return;

    void window.storyforge.getAiStatus().then(setAiStatus).catch(() => {
      setAiStatus({ configured: false, provider: 'mock', model: 'mock', baseUrl: '' });
    });
  }, [canUseDesktopApi]);

  async function createLocalProject() {
    setError('');

    try {
      if (!canUseDesktopApi) {
        setError(t(language, 'error.desktopApiUnavailable'));
        return;
      }

      const parentPath = await window.storyforge.chooseProjectParentDialog();
      if (parentPath) {
        const createdProject = await window.storyforge.createProjectInParent(parentPath, projectName);
        setProject(createdProject);
        setSummary(createdProject.summary);
        setGateReports([]);
        setWorkflowLog([]);
        setLastWorkflowIdea(null);
        setPendingStoryDraft(null);
        setPendingChapterDraft(null);
        setLiveReviewWarnings([]);
        setSelection({ kind: 'world', id: 'bible' });
      }
    } catch (event) {
      setError(event instanceof Error ? event.message : t(language, 'error.createProject'));
    }
  }

  async function openProject() {
    setError('');

    try {
      if (!canUseDesktopApi) {
        setError(t(language, 'error.desktopApiUnavailable'));
        return;
      }

      const path = await window.storyforge.openProjectDialog();
      if (path) {
        const loadedProject = await window.storyforge.loadProject(path);
        setProject(loadedProject);
        setSummary(loadedProject.summary);
        setGateReports([]);
        setWorkflowLog([]);
        setLastWorkflowIdea(null);
        setPendingStoryDraft(null);
        setPendingChapterDraft(null);
        setLiveReviewWarnings(await runLightReview(loadedProject));
      }
    } catch (event) {
      setError(event instanceof Error ? event.message : t(language, 'error.openProject'));
    }
  }

  async function saveActiveDocument(content: string) {
    if (!project || !activeDocument) return;
    if (activeDocument.readOnly) return;

    try {
      if (selection.kind === 'chapter') {
        const currentChapter = project.chapters.find((chapter) => String(chapter.meta.id) === selection.id);
        if (currentChapter && currentChapter.content !== content) {
          setChapterHistory((current) => ({
            ...current,
            [selection.id]: [...(current[selection.id] ?? []), currentChapter]
          }));
        }
      }
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
      if (project.rootPath && canUseDesktopApi) {
        await window.storyforge.saveProjectFile(project.rootPath, activeDocument.relativePath, content);
        if (selection.kind === 'chapter') {
          const file = buildSummaryCacheFile(savedProject, savedProject.summary);
          await window.storyforge.saveProjectFile(project.rootPath, file.relativePath, file.content);
        }
      }
      setProject(savedProject);
      setSummary(savedProject.summary);
      setLiveReviewWarnings(await runLightReview(savedProject));
      setSaveStatus(t(language, 'editor.saved'));
    } catch (event) {
      setSaveStatus(t(language, 'editor.saveFailed'));
      setError(event instanceof Error ? event.message : t(language, 'editor.saveFailed'));
    }
  }

  async function applyProjectMutation(result: ReturnType<typeof createNextChapter>) {
    try {
      if (result.project.rootPath && canUseDesktopApi) {
        await saveProjectFiles(result.project.rootPath, result.files);
        await deleteProjectFiles(result.project.rootPath, result.deletedFiles);
      }
      setProject(result.project);
      setSummary(result.project.summary);
      setSelection(result.selection);
      setLiveReviewWarnings(await runLightReview(result.project));
      setSaveStatus(t(language, 'editor.saved'));
    } catch (event) {
      setSaveStatus(t(language, 'editor.saveFailed'));
      setError(event instanceof Error ? event.message : t(language, 'editor.saveFailed'));
    }
  }

  async function addChapter() {
    if (!project) return;
    await applyProjectMutation(createNextChapter(project));
  }

  async function generateNextChapter() {
    if (!project || isNextChapterGenerating) return;
    if (selection.kind !== 'chapter') {
      setNextChapterStatus(t(language, 'assistant.selectChapterFirst'));
      return;
    }
    if (editorDirty) {
      setNextChapterStatus(t(language, 'assistant.saveBeforeGenerate'));
      return;
    }

    setIsNextChapterGenerating(true);
    setNextChapterStatus('');
    try {
      const workflow = await runNextChapterWorkflow(project, { targetChapterId: Number(selection.id) });
      setPendingStoryDraft(null);
      setPendingChapterDraft(workflow);
      setNextChapterNotes(workflow.reviewNotes);
      setWorkflowLog((current) => [...current, ...workflow.changeLog]);
      setNextChapterStatus(t(language, 'assistant.draftReady'));
    } catch (event) {
      setNextChapterStatus(t(language, 'assistant.nextChapterFailed'));
      setError(event instanceof Error ? event.message : t(language, 'assistant.nextChapterFailed'));
    } finally {
      setIsNextChapterGenerating(false);
    }
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
      const summaryWorkflow = await runSummaryWorkflow(project.chapters);
      const nextSummary = summaryWorkflow.summary;
      const nextProject = { ...project, summary: nextSummary };
      if (project.rootPath && canUseDesktopApi) {
        const file = buildSummaryCacheFile(nextProject, nextSummary);
        await window.storyforge.saveProjectFile(project.rootPath, file.relativePath, file.content);
      }
      setProject(nextProject);
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

  async function applyWorkflow(workflow: StoryWorkflowResult) {
    if (!project) return;

    setGateReports(workflow.gateReports);
    setWorkflowLog(workflow.changeLog);
    setLastWorkflowIdea(workflow.idea);

    try {
      const result = applyStoryWorkflowToProject(project, workflow);
      if (result.project.rootPath && canUseDesktopApi) {
        await saveProjectFiles(result.project.rootPath, result.files);
        await deleteProjectFiles(result.project.rootPath, result.deletedFiles);
      }
      setProject(result.project);
      setSummary(result.project.summary);
      setSelection(result.selection);
      setLiveReviewWarnings(await runLightReview(result.project));
      setExportStatus(t(language, 'assistant.seedApplied'));
    } catch (event) {
      setExportStatus(t(language, 'assistant.seedFailed'));
      setError(event instanceof Error ? event.message : t(language, 'assistant.seedFailed'));
    }
  }

  function queueStoryDraft(workflow: StoryWorkflowResult) {
    setPendingStoryDraft(workflow);
    setPendingChapterDraft(null);
    setNextChapterStatus(t(language, 'assistant.draftReady'));
  }

  async function confirmStoryDraft() {
    if (!pendingStoryDraft) return;
    const draft = pendingStoryDraft;
    setPendingStoryDraft(null);
    await applyWorkflow(draft);
  }

  async function confirmChapterDraft() {
    if (!project || !pendingChapterDraft) return;
    const draft = pendingChapterDraft;
    const replacesExisting = project.chapters.some((chapter) => chapter.meta.id === draft.chapter.meta.id);
    setPendingChapterDraft(null);
    await applyProjectMutation(replacesExisting ? replaceChapterWithDraft(project, draft.chapter) : applyNextChapterToProject(project, draft));
    setNextChapterStatus(t(language, replacesExisting ? 'editor.saved' : 'assistant.nextChapterReady'));
  }

  function discardDraft() {
    setPendingStoryDraft(null);
    setPendingChapterDraft(null);
    setNextChapterStatus('');
  }

  async function regenerateSelectedChapter() {
    if (!project || selection.kind !== 'chapter' || isNextChapterGenerating) return;
    if (editorDirty) {
      setNextChapterStatus(t(language, 'assistant.saveBeforeGenerate'));
      return;
    }

    setIsNextChapterGenerating(true);
    try {
      const workflow = await runNextChapterWorkflow(project, { targetChapterId: Number(selection.id) });
      setPendingStoryDraft(null);
      setPendingChapterDraft(workflow);
      setNextChapterNotes(workflow.reviewNotes);
      setNextChapterStatus(t(language, 'assistant.draftReady'));
    } finally {
      setIsNextChapterGenerating(false);
    }
  }

  async function rollbackSelectedChapter() {
    if (!project || selection.kind !== 'chapter') return;
    const history = chapterHistory[selection.id] ?? [];
    const previous = history[history.length - 1];
    if (!previous) return;

    await applyProjectMutation(replaceChapterWithDraft(project, previous));
    setChapterHistory((current) => ({
      ...current,
      [selection.id]: history.slice(0, -1)
    }));
  }

  async function writeExports() {
    if (!project) return;

    setError('');
    try {
      const result = await writeProjectExports(
        project,
        summary,
        canUseDesktopApi ? window.storyforge.saveProjectFile : undefined
      );
      setExportStatus(t(language, result === 'written' ? 'assistant.exportsWritten' : 'assistant.exportsReady'));
    } catch (event) {
      setExportStatus(t(language, 'assistant.exportFailed'));
      setError(event instanceof Error ? event.message : t(language, 'assistant.exportFailed'));
    }
  }

  async function retryFailedGate() {
    if (!lastWorkflowIdea || isFailedGateRetrying) return;

    setIsFailedGateRetrying(true);
    try {
      await applyWorkflow(await runStoryWorkflow({ idea: lastWorkflowIdea }));
    } finally {
      setIsFailedGateRetrying(false);
    }
  }

  async function openExportsFolder() {
    if (!project?.rootPath || !canUseDesktopApi) {
      setExportStatus(t(language, 'assistant.openExportsUnavailable'));
      return;
    }

    const result = await window.storyforge.openExportsFolder(project.rootPath);
    setExportStatus(result ? result : t(language, 'assistant.exportsOpened'));
  }

  async function testAiConnection() {
    if (isAiTesting) return;

    setIsAiTesting(true);
    if (!canUseDesktopApi || !window.storyforge.testAiConnection) {
      setAiConnectionResult({ ok: false, provider: 'mock', model: 'mock', message: 'Desktop AI diagnostics are unavailable' });
      setIsAiTesting(false);
      return;
    }

    try {
      setAiConnectionResult({ ok: false, provider: aiStatus.provider, model: aiStatus.model, message: t(language, 'assistant.testingAi') });
      const result = await window.storyforge.testAiConnection();
      setAiConnectionResult(result);
      const status = await window.storyforge.getAiStatus();
      setAiStatus(status);
    } catch (event) {
      setAiConnectionResult({
        ok: false,
        provider: aiStatus.provider,
        model: aiStatus.model,
        message: event instanceof Error ? event.message : 'Model connection failed'
      });
    } finally {
      setIsAiTesting(false);
    }
  }

  async function applyAiConfig() {
    if (isAiConfigApplying) return;

    setIsAiConfigApplying(true);
    if (!canUseDesktopApi || !window.storyforge.setAiConfig) {
      setAiConnectionResult({ ok: false, provider: 'mock', model: 'mock', message: 'Desktop AI configuration is unavailable' });
      setIsAiConfigApplying(false);
      return;
    }

    try {
      const status = await window.storyforge.setAiConfig(aiConfigDraft);
      setAiStatus(status);
      setAiConnectionResult({
        ok: status.configured,
        provider: status.provider,
        model: status.model,
        message: status.configured ? 'Session AI config applied' : 'API key is required'
      });
      setAiConfigDraft({ ...aiConfigDraft, apiKey: '' });
    } catch (event) {
      setAiConnectionResult({
        ok: false,
        provider: aiConfigDraft.provider,
        model: aiConfigDraft.model,
        message: event instanceof Error ? event.message : 'Unable to apply AI config'
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
        onCreateProject={createLocalProject}
        error={error}
        onOpenProject={openProject}
      />
    );
  }

  return (
    <main className={assistantCollapsed ? 'workspace assistant-collapsed' : 'workspace'}>
      <ProjectTree
        language={language}
        project={project}
        selection={selection}
        onSelect={setSelection}
        onAddChapter={addChapter}
        onAddCharacter={addCharacter}
        onDeleteCharacter={deleteSelectedCharacter}
        onDeleteChapter={deleteSelectedChapter}
      />
      <EditorPane
        language={language}
        document={activeDocument}
        selection={selection}
        saveStatus={saveStatus}
        canRegenerateChapter={selection.kind === 'chapter' && !editorDirty && !isNextChapterGenerating}
        canRollbackChapter={selection.kind === 'chapter' && !editorDirty && Boolean(chapterHistory[selection.id]?.length)}
        onSave={saveActiveDocument}
        onDirtyChange={onEditorDirtyChange}
        onRegenerateChapter={regenerateSelectedChapter}
        onRollbackChapter={rollbackSelectedChapter}
      />
      <AssistantPanel
        language={language}
        project={project}
        summary={summary}
        onRefreshSummary={refreshSummary}
        exportStatus={exportStatus}
        gateReports={gateReports}
        aiStatus={aiStatus}
        aiConnectionResult={aiConnectionResult}
        workflowLog={workflowLog}
        aiConfigDraft={aiConfigDraft}
        isSummaryRefreshing={isSummaryRefreshing}
        isAiTesting={isAiTesting}
        isAiConfigApplying={isAiConfigApplying}
        isFailedGateRetrying={isFailedGateRetrying}
        isNextChapterGenerating={isNextChapterGenerating}
        canRetryFailedGate={Boolean(lastWorkflowIdea)}
        nextChapterStatus={nextChapterStatus}
        nextChapterNotes={nextChapterNotes}
        focusedChapterTitle={focusedChapterTitle}
        pendingStoryDraft={pendingStoryDraft}
        pendingChapterDraft={pendingChapterDraft}
        liveReviewWarnings={liveReviewWarnings}
        collapsed={assistantCollapsed}
        onAiConfigDraftChange={setAiConfigDraft}
        onApplyAiConfig={applyAiConfig}
        onTestAiConnection={testAiConnection}
        onRetryFailedGate={retryFailedGate}
        onGenerateNextChapter={generateNextChapter}
        onConfirmStoryDraft={confirmStoryDraft}
        onConfirmChapterDraft={confirmChapterDraft}
        onDiscardDraft={discardDraft}
        onToggleCollapsed={() => setAssistantCollapsed((current) => !current)}
        onWriteExports={writeExports}
        onOpenExportsFolder={openExportsFolder}
        onSeed={queueStoryDraft}
      />
    </main>
  );
}
