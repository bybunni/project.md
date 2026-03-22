import { CHANNELS, OPEN_DIALOG_FILTERS } from './channels.js';

function withErrorBoundary(handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return { error: error.message };
    }
  };
}

export function registerProjectIpc({
  ipcMain,
  dialog,
  service,
  getWindows,
}) {
  if (!getWindows) {
    throw new Error('registerProjectIpc requires a getWindows function');
  }

  ipcMain.handle(CHANNELS.openProject, withErrorBoundary(async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: OPEN_DIALOG_FILTERS,
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { cancelled: true };
    }

    return service.openProject(result.filePaths[0]);
  }));

  ipcMain.handle(CHANNELS.getStatus, withErrorBoundary(() => service.getStatus()));
  ipcMain.handle(CHANNELS.getProject, withErrorBoundary(() => service.getProject()));
  ipcMain.handle(CHANNELS.getRaw, withErrorBoundary(() => service.getRaw()));
  ipcMain.handle(CHANNELS.saveRaw, withErrorBoundary((event, content) => service.saveRaw(content)));
  ipcMain.handle(CHANNELS.updateMilestone, withErrorBoundary((event, id, fields) => service.updateMilestone(id, fields)));
  ipcMain.handle(CHANNELS.addMilestone, withErrorBoundary((event, milestone) => service.addMilestone(milestone)));
  ipcMain.handle(CHANNELS.deleteMilestone, withErrorBoundary((event, id) => service.deleteMilestone(id)));
  ipcMain.handle(CHANNELS.moveTask, withErrorBoundary((event, taskId, targetColumn, position) => service.moveTask(taskId, targetColumn, position)));
  ipcMain.handle(CHANNELS.updateTask, withErrorBoundary((event, id, fields) => service.updateTask(id, fields)));
  ipcMain.handle(CHANNELS.addTask, withErrorBoundary((event, task) => service.addTask(task)));
  ipcMain.handle(CHANNELS.deleteTask, withErrorBoundary((event, id) => service.deleteTask(id)));
  ipcMain.handle(CHANNELS.addColumn, withErrorBoundary((event, name) => service.addColumn(name)));
  ipcMain.handle(CHANNELS.renameColumn, withErrorBoundary((event, oldName, newName) => service.renameColumn(oldName, newName)));
  ipcMain.handle(CHANNELS.deleteColumn, withErrorBoundary((event, name) => service.deleteColumn(name)));
  ipcMain.handle(CHANNELS.updateTodo, withErrorBoundary((event, index, fields) => service.updateTodo(index, fields)));
  ipcMain.handle(CHANNELS.addTodo, withErrorBoundary((event, todo) => service.addTodo(todo)));
  ipcMain.handle(CHANNELS.deleteTodo, withErrorBoundary((event, index) => service.deleteTodo(index)));

  const broadcastChange = () => {
    for (const window of getWindows()) {
      if (window.isDestroyed()) {
        continue;
      }

      window.webContents.send(CHANNELS.changed);
    }
  };

  service.on('changed', broadcastChange);

  return async () => {
    service.off('changed', broadcastChange);

    for (const channel of Object.values(CHANNELS)) {
      if (channel === CHANNELS.changed) {
        continue;
      }
      ipcMain.removeHandler(channel);
    }
  };
}

export default registerProjectIpc;
