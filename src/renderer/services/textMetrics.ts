import type { StoryProject } from '../../shared/types.js';

export function countTextCharacters(text: string): number {
  return text.replace(/\s/g, '').length;
}

export function countProjectCharacters(project: StoryProject): number {
  return project.chapters.reduce((total, chapter) => total + countTextCharacters(chapter.content), 0);
}
