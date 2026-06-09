import { describe, expect, it } from 'vitest';
import { buildExportFiles, buildNovelExport, buildSummaryExport, writeProjectExports } from '../renderer/services/exportService';

describe('exportService', () => {
  it('merges chapters into novel text', () => {
    const text = buildNovelExport('Ash Road', [
      { meta: { id: 1, title: 'Chapel', sceneCount: 1, characters: [], locations: [], timelineDay: 1 }, content: '# Chapel\n\nOpening.' }
    ]);

    expect(text).toContain('# Ash Road');
    expect(text).toContain('Opening.');
  });

  it('formats summary data as markdown', () => {
    const text = buildSummaryExport({
      timeline: [{ event: 'Chapel', time: 'Day 1', chapter: 1 }],
      locations: [{ name: 'Ruined Chapel', firstAppearance: 'Chapter 1', scenes: ['Chapter 1'] }],
      characters: [{ name: 'Ash', firstChapter: 1, lastChapter: 1, statusChange: 'Introduced' }]
    });

    expect(text).toContain('## Timeline');
    expect(text).toContain('| Day 1 | Chapel | 1 |');
  });

  it('builds project export file payloads', () => {
    const files = buildExportFiles(
      'Ash Road',
      [{ meta: { id: 1, title: 'Chapel', sceneCount: 1, characters: [], locations: [], timelineDay: 1 }, content: '# Chapel\n\nOpening.' }],
      {
        timeline: [{ event: 'Chapel', time: 'Day 1', chapter: 1 }],
        locations: [],
        characters: []
      }
    );

    expect(files.map((file) => file.relativePath)).toEqual(['exports/novel.txt']);
    expect(files[0].content).toContain('Opening.');
    expect(files[0].content).not.toContain('# Story Summary');
  });

  it('writes export files through the provided project file writer', async () => {
    const calls: Array<{ projectPath: string; relativePath: string; content: string }> = [];
    const result = await writeProjectExports(
      {
        rootPath: 'D:/Stories/Ash-Road',
        settings: { name: 'Ash Road', createdAt: '2026-06-08T00:00:00.000Z', reviewStrictness: 'medium' },
        world: { genre: 'Fantasy', premise: 'A road remembers.', rules: [], terms: {} },
        characters: [],
        plot: [],
        chapters: [
          {
            meta: { id: 1, title: 'Chapel', sceneCount: 1, characters: [], locations: [], timelineDay: 1 },
            content: '# Chapel\n\nOpening.'
          }
        ],
        summary: { timeline: [], locations: [], characters: [] }
      },
      { timeline: [], locations: [], characters: [] },
      async (projectPath, relativePath, content) => {
        calls.push({ projectPath, relativePath, content });
      }
    );

    expect(result).toBe('written');
    expect(calls.map((call) => call.relativePath)).toEqual(['exports/novel.txt']);
    expect(calls[0].projectPath).toBe('D:/Stories/Ash-Road');
    expect(calls[0].content).toContain('Opening.');
  });
});
