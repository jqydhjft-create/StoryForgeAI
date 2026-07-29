import type { StorySkillRunner } from './storySkillContracts.js';

/** Electron preload bridge adapter. Do not import this module from browser code. */
export function createDesktopSkillRunner(): StorySkillRunner | undefined {
  const storyforge =
    typeof window === 'undefined'
      ? undefined
      : (window.storyforge as (typeof window.storyforge & { runSkill?: StorySkillRunner }) | undefined);

  if (!storyforge?.runSkill) {
    return undefined;
  }

  return (request) => storyforge.runSkill?.(request) ?? Promise.reject(new Error('Desktop skill runner is unavailable'));
}
