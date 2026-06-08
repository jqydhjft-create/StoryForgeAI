export type TreeNodeKind = 'world' | 'character' | 'plot' | 'chapter' | 'export';

export interface StoryConcept {
  title: string;
  protagonist: string;
  goal: string;
  conflict: string;
  themes: string[];
}

export interface WorldBible {
  genre: string;
  premise: string;
  rules: string[];
  terms: Record<string, string>;
}

export interface CharacterProfile {
  id: string;
  name: string;
  role: string;
  motivation: string;
  flaw: string;
  arc: string;
}

export interface PlotBeat {
  id: string;
  label: string;
  summary: string;
  chapterHint: number;
}

export interface ChapterMeta {
  id: number;
  title: string;
  sceneCount: number;
  characters: string[];
  locations: string[];
  timelineDay: number;
}

export interface ProjectSettings {
  name: string;
  createdAt: string;
  reviewStrictness: 'low' | 'medium' | 'high';
}

export interface SummaryData {
  timeline: Array<{ event: string; time: string; chapter: number }>;
  locations: Array<{ name: string; firstAppearance: string; scenes: string[] }>;
  characters: Array<{ name: string; firstChapter: number; lastChapter: number; statusChange: string }>;
}

export interface StoryProject {
  rootPath: string;
  settings: ProjectSettings;
  world: WorldBible;
  characters: CharacterProfile[];
  plot: PlotBeat[];
  chapters: Array<{ meta: ChapterMeta; content: string }>;
  summary: SummaryData;
}

export interface ProjectFileWrite {
  relativePath: string;
  content: string;
}
