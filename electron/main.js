import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, dialog, ipcMain } from 'electron';

import ProjectDocumentService from '../lib/document-service.js';
import registerProjectIpc from './register-project-ipc.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const service = new ProjectDocumentService();

let unregisterProjectIpc = null;

async function createWindow() {
  const window = new BrowserWindow({
    width: 1400,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    title: 'project.md',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await window.loadFile(path.join(__dirname, '..', 'dist', 'renderer', 'index.html'));
  }

  return window;
}

async function bootstrap() {
  unregisterProjectIpc = registerProjectIpc({
    ipcMain,
    dialog,
    service,
    getWindows: () => BrowserWindow.getAllWindows(),
  });
  await createWindow();
}

app.whenReady().then(async () => {
  await bootstrap();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', async () => {
  if (unregisterProjectIpc) {
    await unregisterProjectIpc();
  }
  await service.dispose();
});
