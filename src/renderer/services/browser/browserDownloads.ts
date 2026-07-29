import { buildNovelExport } from '../exportService.js';
import type { StoryProject } from '../../../shared/types.js';

export interface BrowserDownload {
  filename: string;
  mimeType: string;
  text: string;
}

function withoutApiKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutApiKeys);
  if (typeof value !== 'object' || value === null) return value;

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) => key === 'apiKey' && typeof entry === 'string'
      ? []
      : [[key, withoutApiKeys(entry)]])
  );
}

export function createProjectBackupDownload(backup: unknown): BrowserDownload {
  return {
    filename: 'storyforge-project.json',
    mimeType: 'application/json',
    text: JSON.stringify(withoutApiKeys(backup), null, 2)
  };
}

export function createNovelDownload(project: Pick<StoryProject, 'settings' | 'chapters'>): BrowserDownload {
  return {
    filename: 'novel.txt',
    mimeType: 'text/plain;charset=utf-8',
    text: buildNovelExport(project.settings.name, project.chapters)
  };
}

export function triggerBrowserDownload(download: BrowserDownload): void {
  const objectUrl = URL.createObjectURL(new Blob([download.text], { type: download.mimeType }));
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = download.filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
