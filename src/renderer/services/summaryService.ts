import type { ChapterMeta, SummaryData } from '../../shared/types.js';

type ChapterInput = { meta: ChapterMeta; content: string };

export function buildSummary(chapters: ChapterInput[]): SummaryData {
  const locations = new Map<string, { name: string; firstAppearance: string; scenes: string[] }>();
  const characters = new Map<string, { name: string; firstChapter: number; lastChapter: number; statusChange: string }>();

  for (const chapter of chapters) {
    for (const location of chapter.meta.locations) {
      const existing = locations.get(location);
      const sceneLabel = `Chapter ${chapter.meta.id}`;

      if (existing) {
        existing.scenes.push(sceneLabel);
      } else {
        locations.set(location, { name: location, firstAppearance: sceneLabel, scenes: [sceneLabel] });
      }
    }

    for (const character of chapter.meta.characters) {
      const existing = characters.get(character);

      if (existing) {
        existing.lastChapter = chapter.meta.id;
      } else {
        characters.set(character, {
          name: character,
          firstChapter: chapter.meta.id,
          lastChapter: chapter.meta.id,
          statusChange: 'Introduced'
        });
      }
    }
  }

  return {
    timeline: chapters.map((chapter) => ({
      event: chapter.meta.title,
      time: `Day ${chapter.meta.timelineDay}`,
      chapter: chapter.meta.id
    })),
    locations: Array.from(locations.values()),
    characters: Array.from(characters.values())
  };
}
