import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { CHANNELS } from '../electron/channels.js';
import registerProjectIpc from '../electron/register-project-ipc.js';
import ProjectDocumentService from '../lib/document-service.js';

const fixturePath = path.join(process.cwd(), 'project.md');
const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');

const cleanups = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    await cleanup();
  }
});

function makeTempProject() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'project-md-ipc-'));
  const filePath = path.join(directory, 'project.md');
  fs.writeFileSync(filePath, fixtureContent, 'utf-8');
  return filePath;
}

function createFakeIpcMain() {
  const handlers = new Map();
  return {
    handlers,
    handle(channel, handler) {
      handlers.set(channel, handler);
    },
    removeHandler(channel) {
      handlers.delete(channel);
    },
  };
}

describe('registerProjectIpc', () => {
  it('wires open/read/save handlers through the shared service', async () => {
    const filePath = makeTempProject();
    const service = new ProjectDocumentService();
    cleanups.push(() => service.dispose());

    const ipcMain = createFakeIpcMain();
    const dialog = {
      showOpenDialog: async () => ({ canceled: false, filePaths: [filePath] }),
    };

    const sentChannels = [];
    const windows = [{
      isDestroyed: () => false,
      webContents: {
        send(channel) {
          sentChannels.push(channel);
        },
      },
    }];

    const unregister = registerProjectIpc({
      ipcMain,
      dialog,
      service,
      getWindows: () => windows,
    });
    cleanups.push(unregister);

    const openResult = await ipcMain.handlers.get(CHANNELS.openProject)({});
    assert.strictEqual(openResult.path, filePath);
    assert.strictEqual(openResult.data.title, 'Website Redesign');

    const status = await ipcMain.handlers.get(CHANNELS.getStatus)({});
    assert.strictEqual(status.filename, 'project.md');

    const saveResult = await ipcMain.handlers.get(CHANNELS.saveRaw)({}, fixtureContent.replace('Website Redesign', 'IPC Save'));
    assert.deepStrictEqual(saveResult, { ok: true });
    assert.deepStrictEqual(sentChannels, []);
  });

  it('broadcasts the change channel when the open file changes externally', async () => {
    const filePath = makeTempProject();
    const service = new ProjectDocumentService();
    cleanups.push(() => service.dispose());

    const ipcMain = createFakeIpcMain();
    const dialog = {
      showOpenDialog: async () => ({ canceled: false, filePaths: [filePath] }),
    };

    const sentChannels = [];
    const unregister = registerProjectIpc({
      ipcMain,
      dialog,
      service,
      getWindows: () => [{
        isDestroyed: () => false,
        webContents: {
          send(channel) {
            sentChannels.push(channel);
          },
        },
      }],
    });
    cleanups.push(unregister);

    await ipcMain.handlers.get(CHANNELS.openProject)({});
    await delay(150);

    fs.writeFileSync(filePath, fixtureContent.replace('Website Redesign', 'IPC External Change'), 'utf-8');
    await delay(400);

    assert.deepStrictEqual(sentChannels, [CHANNELS.changed]);
  });
});
