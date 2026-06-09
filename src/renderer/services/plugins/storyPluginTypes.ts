import type { StoryPluginCapability } from '../../../shared/types.js';

export type StoryPluginHandler<Input = unknown, Output = unknown> = (input: Input) => Promise<Output>;

export type StoryPluginCapabilityMap = Partial<Record<StoryPluginCapability, StoryPluginHandler>>;

export interface StoryPlugin {
  id: string;
  capabilities: StoryPluginCapabilityMap;
}

export interface StoryPluginRegistry {
  invoke<Input = unknown, Output = unknown>(capability: StoryPluginCapability, input: Input): Promise<Output>;
  listCapabilities(): StoryPluginCapability[];
}
