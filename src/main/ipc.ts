import { dialog, ipcMain, shell } from 'electron';
import { join } from 'node:path';
import type { AiProviderConfigInput, StorySkillRequest } from '../shared/types.js';
import { createDeepSeekSkillRunner, getModelStatus, setRuntimeModelConfig, testModelConnection } from './deepSeekClient.js';
import { createProject, createProjectInParent, deleteChapterFile, deleteCharacterFile, loadProject, saveProjectFile } from './projectStore.js';

export function registerIpcHandlers(): void {
  ipcMain.handle('project:create', async (_event, projectPath: string, name: string) => createProject(projectPath, name));
  ipcMain.handle('project:createInParent', async (_event, parentPath: string, name: string) => createProjectInParent(parentPath, name));
  ipcMain.handle('project:load', async (_event, projectPath: string) => loadProject(projectPath));
  ipcMain.handle('project:saveFile', async (_event, projectPath: string, relativePath: string, content: string) =>
    saveProjectFile(projectPath, relativePath, content)
  );
  ipcMain.handle('project:deleteCharacterFile', async (_event, projectPath: string, characterId: string) =>
    deleteCharacterFile(projectPath, characterId)
  );
  ipcMain.handle('project:deleteChapterFile', async (_event, projectPath: string, chapterId: number) =>
    deleteChapterFile(projectPath, chapterId)
  );
  ipcMain.handle('project:openExportsFolder', async (_event, projectPath: string) => shell.openPath(join(projectPath, 'exports')));
  ipcMain.handle('dialog:openProject', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('dialog:chooseProjectParent', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('ai:runSkill', async (_event, request: StorySkillRequest) => createDeepSeekSkillRunner()(request));
  ipcMain.handle('ai:getStatus', async () => getModelStatus());
  ipcMain.handle('ai:setConfig', async (_event, input: AiProviderConfigInput) => setRuntimeModelConfig(input));
  ipcMain.handle('ai:testConnection', async () => testModelConnection());
}
