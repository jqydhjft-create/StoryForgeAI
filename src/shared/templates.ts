import type { ChapterMeta, ProjectSettings, SummaryData, WorldBible } from './types.js';

export function createDefaultSettings(name: string): ProjectSettings {
  return {
    name,
    createdAt: new Date().toISOString(),
    reviewStrictness: 'medium'
  };
}

export function createDefaultWorld(): WorldBible {
  return {
    genre: 'Speculative fiction',
    premise: '',
    rules: [],
    terms: {}
  };
}

export function createDefaultChapterMeta(): ChapterMeta[] {
  return [
    {
      id: 1,
      title: 'Chapter 1',
      sceneCount: 1,
      characters: [],
      locations: [],
      timelineDay: 1
    }
  ];
}

export function createDefaultSummary(): SummaryData {
  return {
    timeline: [],
    locations: [],
    characters: []
  };
}

export function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
