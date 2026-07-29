import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeBrowserDatabase, openBrowserDatabase } from '../renderer/services/browser/browserDb';
import { createBrowserProjectStore } from '../renderer/services/browser/browserProjectStore';
import { persistWorkflowMutationForRequest } from '../renderer/services/workflowRequestPersistence';
import { confirmWorkflowArtifact } from '../renderer/services/workflowMutations';

async function clearProjects() {
  const database = await openBrowserDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction('projects', 'readwrite');
    transaction.objectStore('projects').clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function intake() {
  return { genre: 'Mystery', worldPremise: 'A secret', protagonist: 'Mira', coreConflict: 'Truth', readerFeeling: 'Dread', targetLength: '10k', requiredElements: [] };
}

describe('workflow request persistence', () => {
  beforeEach(clearProjects);
  afterEach(closeBrowserDatabase);

  it('does not persist a delayed project-A workflow result after project B becomes active', async () => {
    const store = createBrowserProjectStore();
    const projectA = await store.create('A');
    const projectB = await store.create('B');
    const result = confirmWorkflowArtifact(projectA, 'intake', intake());
    let current = projectB;

    await persistWorkflowMutationForRequest(result, projectA, 'intake', {
      currentProject: () => current,
      saveProject: store.save,
      replaceProject: (next) => { current = next; }
    });

    expect(current.rootPath).toBe(projectB.rootPath);
    expect((await store.load(projectB.rootPath)).workflow.artifacts.initialSettingBook).toBeUndefined();
    expect((await store.load(projectA.rootPath)).workflow.artifacts.initialSettingBook).toBeUndefined();
  });

  it('persists an editor change made while the workflow result is being written', async () => {
    const store = createBrowserProjectStore();
    const request = await store.create('A');
    const result = confirmWorkflowArtifact(request, 'intake', intake());
    let current = request;
    let saves = 0;

    await persistWorkflowMutationForRequest(result, request, 'intake', {
      currentProject: () => current,
      saveProject: async (next) => {
        await store.save(next);
        saves += 1;
        if (saves === 1) {
          current = { ...next, chapters: [{ ...next.chapters[0], content: 'Edited while workflow persisted' }] };
          await store.save(current);
        }
      },
      replaceProject: (next) => { current = next; }
    });

    const persisted = await store.load(request.rootPath);
    expect(persisted.chapters[0].content).toBe('Edited while workflow persisted');
    expect(persisted.workflow.artifacts.initialSettingBook).toEqual(expect.objectContaining({ protagonist: 'Mira' }));
  });
});
