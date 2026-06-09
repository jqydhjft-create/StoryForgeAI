import type {
  AiConnectionTestResult,
  AiProviderConfigInput,
  AiProviderStatus,
  StoryProject,
  StorySkillRequest,
  StorySkillResponse
} from '../shared/types.js';

const { contextBridge, ipcRenderer } = require('electron');

const api = {
  createProject: (projectPath: string, name: string): Promise<StoryProject> => ipcRenderer.invoke('project:create', projectPath, name),
  createProjectInParent: (parentPath: string, name: string): Promise<StoryProject> =>
    ipcRenderer.invoke('project:createInParent', parentPath, name),
  loadProject: (projectPath: string): Promise<StoryProject> => ipcRenderer.invoke('project:load', projectPath),
  saveProjectFile: (projectPath: string, relativePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke('project:saveFile', projectPath, relativePath, content),
  deleteCharacterFile: (projectPath: string, characterId: string): Promise<void> =>
    ipcRenderer.invoke('project:deleteCharacterFile', projectPath, characterId),
  deleteChapterFile: (projectPath: string, chapterId: number): Promise<void> =>
    ipcRenderer.invoke('project:deleteChapterFile', projectPath, chapterId),
  runSkill: (request: StorySkillRequest): Promise<StorySkillResponse> => ipcRenderer.invoke('ai:runSkill', request),
  getAiStatus: (): Promise<AiProviderStatus> => ipcRenderer.invoke('ai:getStatus'),
  setAiConfig: (input: AiProviderConfigInput): Promise<AiProviderStatus> => ipcRenderer.invoke('ai:setConfig', input),
  testAiConnection: (): Promise<AiConnectionTestResult> => ipcRenderer.invoke('ai:testConnection'),
  openExportsFolder: (projectPath: string): Promise<string> => ipcRenderer.invoke('project:openExportsFolder', projectPath),
  openProjectDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openProject'),
  chooseProjectParentDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:chooseProjectParent')
};

contextBridge.exposeInMainWorld('storyforge', api);
