import { useEffect, useMemo, useState } from 'react';
import type { ProjectFileWrite, StoryProject, SummaryData } from '../shared/types.js';
import { StartScreen } from './components/StartScreen';
import { ProjectTree, type TreeSelection } from './components/ProjectTree';
import { EditorPane } from './components/EditorPane';
import { AssistantPanel } from './components/AssistantPanel';
import type { Language } from './i18n';
import { t } from './i18n';
import { applyEditableDocument, getEditableDocument } from './services/editorDocuments';
import { writeProjectExports } from './services/exportService';
import { generateStorySeed } from './services/mockAiService';
import type { StorySeed } from './services/mockAiService';
import {
  applyStorySeedToProject,
  buildSummaryCacheFile,
  createNewCharacter,
  createNextChapter,
  deleteCharacter
} from './services/projectMutations';
import { buildSummary } from './services/summaryService';

function createInMemoryProject(seed: StorySeed): StoryProject {
  return {
    rootPath: '',
    settings: { name: seed.concept.title, createdAt: new Date().toISOString(), reviewStrictness: 'medium' },
    world: seed.world,
    characters: seed.characters,
    plot: seed.plot,
    chapters: [
      {
        meta: {
          id: 1,
          title: 'Chapter 1',
          sceneCount: 1,
          characters: ['Ash', 'Milo'],
          locations: ['Ruined Chapel'],
          timelineDay: 1
        },
        content: '# Chapter 1\n\nAsh finds Milo in a ruined chapel at dawn.'
      }
    ],
    summary: { timeline: [], locations: [], characters: [] }
  };
}

export function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [projectName, setProjectName] = useState('Ash Road');
  const [project, setProject] = useState<StoryProject | null>(null);
  const [summary, setSummary] = useState<SummaryData>({ timeline: [], locations: [], characters: [] });
  const [selection, setSelection] = useState<TreeSelection>({ kind: 'world', id: 'bible' });
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [exportStatus, setExportStatus] = useState('');

  const canUseDesktopApi = useMemo(() => Boolean(window.storyforge), []);
  const activeDocument = project ? getEditableDocument(project, selection) : null;

  async function saveProjectFiles(projectPath: string, files: ProjectFileWrite[]) {
    for (const file of files) {
      await window.storyforge.saveProjectFile(projectPath, file.relativePath, file.content);
    }
  }

  async function deleteCharacterFiles(projectPath: string, relativePaths: string[]) {
    for (const relativePath of relativePaths) {
      const match = /^characters\/([a-z0-9-]+)\.json$/i.exec(relativePath);
      if (match) {
        await window.storyforge.deleteCharacterFile(projectPath, match[1]);
      }
    }
  }

  useEffect(() => {
    setSaveStatus('');
  }, [selection.kind, selection.id, language]);

  useEffect(() => {
    setExportStatus('');
  }, [language, project?.rootPath]);

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
      }
    } catch (event) {
      setError(event instanceof Error ? event.message : t(language, 'error.openProject'));
    }
  }

  async function saveActiveDocument(content: string) {
    if (!project || !activeDocument) return;

    try {
      const nextProject = applyEditableDocument(project, selection, content);
      if (project.rootPath && canUseDesktopApi) {
        await window.storyforge.saveProjectFile(project.rootPath, activeDocument.relativePath, content);
      }
      setProject(nextProject);
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
        await deleteCharacterFiles(result.project.rootPath, result.deletedFiles);
      }
      setProject(result.project);
      setSummary(result.project.summary);
      setSelection(result.selection);
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

  async function addCharacter() {
    if (!project) return;
    await applyProjectMutation(createNewCharacter(project));
  }

  async function deleteSelectedCharacter() {
    if (!project || selection.kind !== 'character') return;
    await applyProjectMutation(deleteCharacter(project, selection.id));
  }

  async function refreshSummary() {
    if (!project) return;

    const nextSummary = buildSummary(project.chapters);
    const nextProject = { ...project, summary: nextSummary };
    try {
      if (project.rootPath && canUseDesktopApi) {
        const file = buildSummaryCacheFile(nextProject, nextSummary);
        await window.storyforge.saveProjectFile(project.rootPath, file.relativePath, file.content);
      }
      setProject(nextProject);
      setSummary(nextSummary);
      setSaveStatus(t(language, 'editor.saved'));
    } catch (event) {
      setSaveStatus(t(language, 'editor.saveFailed'));
      setError(event instanceof Error ? event.message : t(language, 'editor.saveFailed'));
    }
  }

  async function applySeed(seed: StorySeed) {
    if (!project) return;

    try {
      const result = applyStorySeedToProject(project, seed);
      if (result.project.rootPath && canUseDesktopApi) {
        await saveProjectFiles(result.project.rootPath, result.files);
        await deleteCharacterFiles(result.project.rootPath, result.deletedFiles);
      }
      setProject(result.project);
      setSummary(result.project.summary);
      setSelection(result.selection);
      setExportStatus(t(language, 'assistant.seedApplied'));
    } catch (event) {
      setExportStatus(t(language, 'assistant.seedFailed'));
      setError(event instanceof Error ? event.message : t(language, 'assistant.seedFailed'));
    }
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

  async function openExportsFolder() {
    if (!project?.rootPath || !canUseDesktopApi) {
      setExportStatus(t(language, 'assistant.openExportsUnavailable'));
      return;
    }

    const result = await window.storyforge.openExportsFolder(project.rootPath);
    setExportStatus(result ? result : t(language, 'assistant.exportsOpened'));
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
        onCreateDemo={() => {
          const demo = createInMemoryProject(generateStorySeed('A retired knight protects an orphan in the wasteland.'));
          setProject(demo);
          setSummary(demo.summary);
        }}
      />
    );
  }

  return (
    <main className="workspace">
      <ProjectTree
        language={language}
        project={project}
        selection={selection}
        onSelect={setSelection}
        onAddChapter={addChapter}
        onAddCharacter={addCharacter}
        onDeleteCharacter={deleteSelectedCharacter}
      />
      <EditorPane
        language={language}
        document={activeDocument}
        selection={selection}
        saveStatus={saveStatus}
        onSave={saveActiveDocument}
      />
      <AssistantPanel
        language={language}
        project={project}
        summary={summary}
        onRefreshSummary={refreshSummary}
        exportStatus={exportStatus}
        onWriteExports={writeExports}
        onOpenExportsFolder={openExportsFolder}
        onSeed={applySeed}
      />
    </main>
  );
}
