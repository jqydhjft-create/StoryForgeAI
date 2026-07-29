const DATABASE_NAME = 'storyforge-browser';
const DATABASE_VERSION = 1;

let databasePromise: Promise<IDBDatabase> | undefined;
let openDatabase: IDBDatabase | undefined;
let databaseGeneration = 0;

export function openBrowserDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    const openGeneration = databaseGeneration;

    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains('projects')) {
          database.createObjectStore('projects', { keyPath: 'id' });
        }

        if (!database.objectStoreNames.contains('settings')) {
          database.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        const database = request.result;

        if (openGeneration !== databaseGeneration) {
          database.close();
          resolve(database);
          return;
        }

        openDatabase = database;
        resolve(database);
      };
      request.onerror = () => {
        if (openGeneration === databaseGeneration) {
          databasePromise = undefined;
        }
        reject(request.error);
      };
    });
  }

  return databasePromise;
}

export function closeBrowserDatabase(): void {
  databaseGeneration += 1;
  openDatabase?.close();
  openDatabase = undefined;
  databasePromise = undefined;
}
