import { describe, expect, it } from 'vitest';
import type { StoryPlugin } from '../renderer/services/plugins/storyPluginTypes';
import { createStoryPluginRegistry } from '../renderer/services/plugins/storyPluginRegistry';

describe('storyPluginRegistry', () => {
  it('invokes a registered plugin capability', async () => {
    const plugin: StoryPlugin = {
      id: 'test-plugin',
      capabilities: {
        write_chapter: async (input) => ({ echoed: input })
      }
    };

    const registry = createStoryPluginRegistry([plugin]);
    const result = await registry.invoke('write_chapter', { chapterId: 2 });

    expect(result).toEqual({ echoed: { chapterId: 2 } });
  });

  it('throws a clear error when no plugin provides the capability', async () => {
    const registry = createStoryPluginRegistry([]);

    await expect(registry.invoke('write_chapter', {})).rejects.toThrow('No story plugin registered for write_chapter');
  });
});
