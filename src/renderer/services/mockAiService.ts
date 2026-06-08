import type { CharacterProfile, PlotBeat, StoryConcept, WorldBible } from '../../shared/types.js';

export interface StorySeed {
  concept: StoryConcept;
  world: WorldBible;
  characters: CharacterProfile[];
  plot: PlotBeat[];
}

export function generateStorySeed(idea: string): StorySeed {
  const trimmedIdea = idea.trim();
  const premise = trimmedIdea.length > 0 ? trimmedIdea : 'A wounded guardian carries hope across a hostile world.';

  return {
    concept: {
      title: 'Wasteland Guardian',
      protagonist: 'Ash, a retired knight with a broken code of honor',
      goal: 'Protect an orphan who may cure the plague crossing the wasteland',
      conflict: 'Old rules of honor collide with survival in a ruined world',
      themes: [
        'Protection means accepting consequences, not obeying rules',
        'Hope grows where certainty has failed',
        'Sacrifice is defined by survivors as much as by the fallen'
      ]
    },
    world: {
      genre: 'Low fantasy apocalypse',
      premise,
      rules: [
        'Every settlement measures morality against scarcity',
        'The plague follows old pilgrimage roads',
        'Relics work only when their history is remembered'
      ],
      terms: {
        Ashroad: 'The broken road through quarantined kingdoms',
        Grayfall: 'The season when plague dust moves with the wind'
      }
    },
    characters: [
      {
        id: 'ash',
        name: 'Ash',
        role: 'Protagonist',
        motivation: 'Redeem a failure he refuses to name',
        flaw: 'Mistakes obedience for honor',
        arc: 'From rule-bound guard to accountable protector'
      },
      {
        id: 'milo',
        name: 'Milo',
        role: 'Orphan',
        motivation: 'Survive long enough to understand his gift',
        flaw: 'Trusts danger faster than comfort',
        arc: 'From frightened passenger to chosen witness'
      },
      {
        id: 'mutt',
        name: 'Mutt',
        role: 'Antagonist',
        motivation: 'Control the cure to rule the settlements',
        flaw: 'Sees mercy as a tactical weakness',
        arc: 'From pragmatic warlord to isolated tyrant'
      }
    ],
    plot: [
      { id: 'opening', label: 'Opening Image', summary: 'Ash finds Milo in a ruined chapel.', chapterHint: 1 },
      { id: 'call', label: 'Call To Guard', summary: 'A healer identifies Milo as the possible cure.', chapterHint: 2 },
      { id: 'midpoint', label: 'False Shelter', summary: 'A settlement offers safety in exchange for surrendering Milo.', chapterHint: 5 },
      { id: 'ordeal', label: 'Honor Breaks', summary: 'Ash violates his old code to save the child.', chapterHint: 8 },
      { id: 'finale', label: 'Road Of Witnesses', summary: 'The cure survives because the settlements choose cooperation.', chapterHint: 12 }
    ]
  };
}
