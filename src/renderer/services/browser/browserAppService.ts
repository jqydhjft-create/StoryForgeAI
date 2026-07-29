import type { AppService } from '../appService.js';
import type { AiConnectionTestResult, AiProviderConfigInput, AiProviderStatus, StorySkillRequest } from '../../../shared/types.js';
import { createWorkflowServiceForRunner } from '../workflowService.js';
import { createBrowserAiConfigStore, type BrowserAiConfigStore } from './browserAiConfigStore.js';
import { createBrowserProjectStore, type BrowserProjectStore } from './browserProjectStore.js';
import { createBrowserSkillRunner } from './browserSkillRunner.js';

export interface BrowserAppServiceDependencies {
  projectStore?: BrowserProjectStore;
  aiConfigStore?: BrowserAiConfigStore;
  fetchImpl?: typeof fetch;
}

function statusFor(config: AiProviderConfigInput | null): AiProviderStatus {
  return config
    ? { configured: true, provider: config.provider, model: config.model, baseUrl: config.baseUrl }
    : { configured: false, provider: 'mock', model: 'mock', baseUrl: '' };
}

function configuredConfig(config: AiProviderConfigInput | null): AiProviderConfigInput | null {
  return config?.apiKey.trim() ? config : null;
}

function connectionRequest(): StorySkillRequest {
  return {
    skillId: 'theme-generator',
    systemPrompt: 'Return only JSON.',
    userPrompt: 'Return a JSON object with ok true.',
    schemaHint: '{"ok":true}',
    outputSchema: '{"ok":true}',
    repairPrompt: 'Return only JSON.',
    exampleInput: '{"ping":true}',
    exampleOutput: '{"ok":true}'
  };
}

/** Browser-only composition root. Each created workflow has exactly one complete provider. */
export function createBrowserAppService({
  projectStore = createBrowserProjectStore(),
  aiConfigStore = createBrowserAiConfigStore(),
  fetchImpl = fetch
}: BrowserAppServiceDependencies = {}): AppService {
  async function loadConfig(): Promise<AiProviderConfigInput | null> {
    return configuredConfig(await aiConfigStore.load());
  }

  return {
    projectStore,
    createProject: (name) => projectStore.create(name),
    listProjects: () => projectStore.list(),
    loadProject: (rootPath) => projectStore.load(rootPath),
    saveProject: (project) => projectStore.save(project),
    removeProject: (rootPath) => projectStore.remove(rootPath),
    exportProject: (project) => projectStore.exportProject(project),
    importProject: (value) => projectStore.importProject(value),
    loadAiConfig: loadConfig,
    saveAiConfig: (config) => aiConfigStore.save(config),
    clearAiConfig: () => aiConfigStore.clear(),
    async getAiStatus() {
      return statusFor(await loadConfig());
    },
    async createWorkflowService() {
      const config = await loadConfig();
      return createWorkflowServiceForRunner(config ? createBrowserSkillRunner(config, fetchImpl) : null);
    },
    async testAiConnection(): Promise<AiConnectionTestResult> {
      const config = await loadConfig();
      const status = statusFor(config);
      if (!config) {
        return { ok: false, provider: 'mock', model: 'mock', message: 'API key is not configured' };
      }

      try {
        await createBrowserSkillRunner(config, fetchImpl)(connectionRequest());
        return { ok: true, provider: status.provider, model: status.model, message: 'Model connection succeeded' };
      } catch (error) {
        return {
          ok: false,
          provider: status.provider,
          model: status.model,
          message: error instanceof Error ? error.message : 'Model connection failed'
        };
      }
    }
  };
}
