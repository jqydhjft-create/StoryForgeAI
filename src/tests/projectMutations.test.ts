import { describe, expect, it } from 'vitest';
import type { StoryProject } from '../shared/types';
import { generateStorySeed } from '../renderer/services/mockAiService';
import { runStoryWorkflow } from '../renderer/services/storyWorkflow';
import {
  applyStoryWorkflowToProject,
  applyStorySeedToProject,
  buildSummaryCacheFile,
  createNewCharacter,
  createNextChapter,
  deleteChapter,
  deleteCharacter,
  applyNextChapterToProject,
  replaceChapterWithDraft
} from '../renderer/services/projectMutations';
import type { NextChapterWorkflowResult } from '../renderer/services/nextChapterWorkflow';

const project: StoryProject = {
  rootPath: 'D:/Stories/Ash-Road',
  settings: { name: 'Ash Road', createdAt: '2026-06-08T00:00:00.000Z', reviewStrictness: 'medium' },
  world: { genre: 'Low fantasy', premise: 'A road story', rules: ['Keep moving'], terms: {} },
  characters: [
    {
      id: 'ash',
      name: 'Ash',
      role: 'Protagonist',
      motivation: 'Find the road home',
      flaw: 'Distrustful',
      arc: 'Learns to ask for help'
    }
  ],
  plot: [{ id: 'opening', label: 'Opening', summary: 'A beginning', chapterHint: 1 }],
  chapters: [
    {
      meta: { id: 1, title: 'Chapel', sceneCount: 1, characters: ['Ash'], locations: ['Chapel'], timelineDay: 1 },
      content: '# Chapel\n\nOpening text.'
    }
  ],
  summary: { timeline: [], locations: [], characters: [] }
};

describe('projectMutations', () => {
  it('creates the next chapter and file writes', () => {
    const result = createNextChapter(project);

    expect(result.project.chapters[1].meta.id).toBe(2);
    expect(result.selection).toEqual({ kind: 'chapter', id: '2' });
    expect(result.files.map((file) => file.relativePath)).toEqual(['chapters/02.md', 'chapters/meta.json']);
  });

  it('creates a uniquely named character profile', () => {
    const result = createNewCharacter(project);

    expect(result.project.characters.map((character) => character.id)).toContain('new-character');
    expect(result.files[0].relativePath).toBe('characters/new-character.json');
    expect(result.selection).toEqual({ kind: 'character', id: 'new-character' });
  });

  it('deletes a character and returns the file to remove', () => {
    const result = deleteCharacter(project, 'ash');

    expect(result.project.characters).toEqual([]);
    expect(result.deletedFiles).toEqual(['characters/ash.json']);
    expect(result.selection).toEqual({ kind: 'world', id: 'bible' });
  });

  it('deletes a chapter, removes the markdown file, and rewrites metadata', () => {
    const twoChapterProject: StoryProject = {
      ...project,
      chapters: [
        ...project.chapters,
        {
          meta: { id: 2, title: 'Road', sceneCount: 1, characters: [], locations: [], timelineDay: 2 },
          content: '# Road\n\nMore text.'
        }
      ]
    };

    const result = deleteChapter(twoChapterProject, 1);

    expect(result.project.chapters.map((chapter) => chapter.meta.id)).toEqual([2]);
    expect(result.files.map((file) => file.relativePath)).toEqual(['chapters/meta.json']);
    expect(result.deletedFiles).toEqual(['chapters/01.md']);
    expect(result.selection).toEqual({ kind: 'chapter', id: '2' });
  });

  it('builds a chapter metadata file with summary cache', () => {
    const file = buildSummaryCacheFile(project, {
      timeline: [{ event: 'Chapel', time: 'Day 1', chapter: 1 }],
      locations: [],
      characters: []
    });

    expect(file.relativePath).toBe('chapters/meta.json');
    expect(file.content).toContain('summaryCache');
    expect(file.content).toContain('Chapel');
  });

  it('applies generated seed assets to an existing project with file writes', () => {
    const result = applyStorySeedToProject(
      {
        ...project,
        characters: [
          ...project.characters,
          {
            id: 'legacy',
            name: 'Legacy',
            role: 'Supporting',
            motivation: 'Stay behind',
            flaw: 'Static',
            arc: 'Leaves the draft'
          }
        ]
      },
      generateStorySeed('A plague road.')
    );

    expect(result.project.settings.name).toBe('荒原守望者');
    expect(result.project.characters).toHaveLength(3);
    expect(result.deletedFiles).toEqual(['characters/legacy.json']);
    expect(result.files.map((file) => file.relativePath)).toContain('settings.json');
    expect(result.files.map((file) => file.relativePath)).toContain('characters/milo.json');
    expect(result.files.map((file) => file.relativePath)).toContain('chapters/meta.json');
  });

  it('applies a workflow result with the scene writing workshop chapter draft', async () => {
    const workflow = await runStoryWorkflow({ idea: '一位退隐骑士在荒原中保护一个孤儿。' });
    const result = applyStoryWorkflowToProject(project, workflow);

    expect(result.project.chapters[0].meta.title).toBe('第一章');
    expect(result.project.chapters[0].content).toContain('黎明时分');
    expect(result.files.find((file) => file.relativePath === 'chapters/01.md')?.content).toContain('黎明时分');
  });

  it('does not apply workflow assets when a quality gate is still failed', async () => {
    const workflow = await runStoryWorkflow({ idea: '一位退隐骑士在荒原中保护一个孤儿。' });

    expect(() =>
      applyStoryWorkflowToProject(project, {
        ...workflow,
        gateReports: [
          {
            id: 'character-review',
            label: '人物审查',
            status: 'failed',
            summary: '人物动机仍不清晰。',
            retryTarget: 'character-generator'
          }
        ]
      })
    ).toThrow('Quality gate failed: 人物审查');
  });

  it('normalizes AI-generated character ids before building file paths', async () => {
    const workflow = await runStoryWorkflow({ idea: 'A road story.' });
    const result = applyStoryWorkflowToProject(project, {
      ...workflow,
      seed: {
        ...workflow.seed,
        characters: [
          { id: '../settings', name: 'Unsafe One', role: 'Lead', motivation: 'Move', flaw: 'Risk', arc: 'Learns' },
          { id: 'milo/../../evil', name: 'Unsafe Two', role: 'Support', motivation: 'Help', flaw: 'Fear', arc: 'Braver' }
        ]
      }
    });

    expect(result.project.characters.map((character) => character.id)).toEqual(['settings', 'milo-evil']);
    expect(result.files.map((file) => file.relativePath)).toContain('characters/settings.json');
    expect(result.files.map((file) => file.relativePath)).toContain('characters/milo-evil.json');
    expect(result.files.map((file) => file.relativePath)).not.toContain('characters/../settings.json');
  });

  it('applies a generated next chapter without replacing existing chapters', () => {
    const workflow: NextChapterWorkflowResult = {
      contextPacket: {
        projectName: 'Ash Road',
        nextChapterId: 2,
        targetBeat: { id: 'call', label: '守护召唤', summary: '医者指出米洛可能是瘟疫解药。', chapterHint: 2 },
        recentChapters: [{ id: 1, title: 'Chapel', summary: 'Opening text.' }],
        characterStates: [{ name: 'Ash', role: 'Protagonist', status: 'Learns to ask for help' }],
        worldRules: ['Keep moving'],
        summary: project.summary,
        openPlotBeats: project.plot
      },
      chapter: {
        meta: { id: 2, title: 'Chapter 2', sceneCount: 1, characters: ['Ash'], locations: ['Road'], timelineDay: 2 },
        content: '# Chapter 2\n\nAsh follows the road.'
      },
      reviewReport: { status: 'passed', summary: 'Clean.', issues: [] },
      saveDecision: 'ready_to_save',
      reviewNotes: ['Keeps continuity with Chapter 1'],
      changeLog: ['Mock next chapter generated']
    };

    const result = applyNextChapterToProject(project, workflow);

    expect(result.project.chapters.map((chapter) => chapter.meta.id)).toEqual([1, 2]);
    expect(result.selection).toEqual({ kind: 'chapter', id: '2' });
    expect(result.files.map((file) => file.relativePath)).toEqual(['chapters/02.md', 'chapters/meta.json']);
    expect(result.files[0].content).toContain('Ash follows the road.');
  });

  it('replaces the selected chapter from a confirmed draft', () => {
    const result = replaceChapterWithDraft(project, {
      meta: { id: 1, title: 'Chapel rewritten', sceneCount: 1, characters: ['Ash'], locations: ['Chapel'], timelineDay: 1 },
      content: '# Chapel rewritten\n\nA cleaner draft.'
    });

    expect(result.project.chapters).toHaveLength(1);
    expect(result.project.chapters[0].meta.title).toBe('Chapel rewritten');
    expect(result.selection).toEqual({ kind: 'chapter', id: '1' });
    expect(result.files.map((file) => file.relativePath)).toEqual(['chapters/01.md', 'chapters/meta.json']);
  });
});
