import { contextBridge, ipcRenderer } from 'electron';
import type { StoryProject } from '../shared/types.js';

const api = {
  createProject: (projectPath: string, name: string): Promise<StoryProject> =>
    ipcRenderer.invoke('project:create', projectPath, name),
  createProjectInParent: (parentPath: string, name: string): Promise<StoryProject> =>
    ipcRenderer.invoke('project:createInParent', parentPath, name),
  loadProject: (projectPath: string): Promise<StoryProject> => ipcRenderer.invoke('project:load', projectPath),
  saveProjectFile: (projectPath: string, relativePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke('project:saveFile', projectPath, relativePath, content),
  openProjectDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openProject'),
  chooseProjectParentDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:chooseProjectParent')
};

contextBridge.exposeInMainWorld('storyforge', api);

declare global {
  interface Window {
    storyforge: typeof api;
  }
}
