import { dialog, ipcMain } from 'electron';
import { createProject, loadProject, saveProjectFile } from './projectStore.js';

export function registerIpcHandlers(): void {
  ipcMain.handle('project:create', async (_event, projectPath: string, name: string) => createProject(projectPath, name));
  ipcMain.handle('project:load', async (_event, projectPath: string) => loadProject(projectPath));
  ipcMain.handle('project:saveFile', async (_event, projectPath: string, relativePath: string, content: string) =>
    saveProjectFile(projectPath, relativePath, content)
  );
  ipcMain.handle('dialog:openProject', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });
}
