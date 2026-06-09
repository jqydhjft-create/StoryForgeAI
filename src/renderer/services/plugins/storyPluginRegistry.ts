import type { StoryPluginCapability } from '../../../shared/types.js';
import type { StoryPlugin, StoryPluginRegistry } from './storyPluginTypes';

export function createStoryPluginRegistry(plugins: StoryPlugin[]): StoryPluginRegistry {
  return {
    async invoke<Input, Output>(capability: StoryPluginCapability, input: Input): Promise<Output> {
      const plugin = plugins.find((item) => item.capabilities[capability]);
      const handler = plugin?.capabilities[capability];
      if (!handler) {
        throw new Error(`No story plugin registered for ${capability}`);
      }

      return handler(input) as Promise<Output>;
    },

    listCapabilities(): StoryPluginCapability[] {
      const capabilities = new Set<StoryPluginCapability>();
      for (const plugin of plugins) {
        for (const capability of Object.keys(plugin.capabilities) as StoryPluginCapability[]) {
          capabilities.add(capability);
        }
      }
      return Array.from(capabilities.values()).sort();
    }
  };
}
