import type { ChapterMeta, ProjectFileWrite, StoryProject, SummaryData } from '../../shared/types.js';

type ChapterInput = { meta: ChapterMeta; content: string };

export function buildNovelExport(title: string, chapters: ChapterInput[]): string {
  const body = chapters
    .sort((left, right) => left.meta.id - right.meta.id)
    .map((chapter) => chapter.content.trim())
    .join('\n\n---\n\n');

  return `# ${title}\n\n${body}\n`;
}

export function buildSummaryExport(summary: SummaryData): string {
  const timelineRows = summary.timeline.map((item) => `| ${item.time} | ${item.event} | ${item.chapter} |`).join('\n');
  const locationRows = summary.locations.map((item) => `- **${item.name}**: ${item.scenes.join(', ')}`).join('\n');
  const characterRows = summary.characters
    .map((item) => `- **${item.name}**: Chapter ${item.firstChapter} to Chapter ${item.lastChapter}; ${item.statusChange}`)
    .join('\n');

  return [
    '# Story Summary',
    '',
    '## Timeline',
    '| Story Time | Event | Chapter |',
    '| --- | --- | --- |',
    timelineRows,
    '',
    '## Locations',
    locationRows,
    '',
    '## Characters',
    characterRows,
    ''
  ].join('\n');
}

export function buildExportFiles(title: string, chapters: ChapterInput[], summary: SummaryData): ProjectFileWrite[] {
  return [
    { relativePath: 'exports/novel.txt', content: buildNovelExport(title, chapters) },
    { relativePath: 'exports/summary.md', content: buildSummaryExport(summary) }
  ];
}

export type ExportWriteResult = 'written' | 'preview';

export async function writeProjectExports(
  project: StoryProject,
  summary: SummaryData,
  saveProjectFile?: (projectPath: string, relativePath: string, content: string) => Promise<void>
): Promise<ExportWriteResult> {
  if (!project.rootPath || !saveProjectFile) {
    return 'preview';
  }

  const files = buildExportFiles(project.settings.name, project.chapters, summary);
  for (const file of files) {
    await saveProjectFile(project.rootPath, file.relativePath, file.content);
  }

  return 'written';
}
