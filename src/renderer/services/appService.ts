import type {
  AiConnectionTestResult,
  AiProviderConfigInput,
  AiProviderStatus,
  StoryProject
} from '../../shared/types.js';
import type { BrowserProjectBackup, BrowserProjectStore } from './browser/browserProjectStore.js';
import type { WorkflowService } from './workflowService.js';

/** Runtime boundary consumed by the renderer, independent of Electron globals. */
export interface AppService {
  projectStore: BrowserProjectStore;
  createProject(name: string): Promise<StoryProject>;
  listProjects(): Promise<StoryProject[]>;
  loadProject(rootPath: string): Promise<StoryProject>;
  saveProject(project: StoryProject): Promise<void>;
  removeProject(rootPath: string): Promise<void>;
  exportProject(project: StoryProject): BrowserProjectBackup;
  importProject(value: unknown): Promise<StoryProject>;
  loadAiConfig(): Promise<AiProviderConfigInput | null>;
  saveAiConfig(config: AiProviderConfigInput): Promise<void>;
  clearAiConfig(): Promise<void>;
  getAiStatus(): Promise<AiProviderStatus>;
  testAiConnection(): Promise<AiConnectionTestResult>;
  createWorkflowService(): Promise<WorkflowService>;
}
