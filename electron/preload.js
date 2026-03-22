import { contextBridge, ipcRenderer } from 'electron';

import { CHANNELS } from './channels.js';

const api = {
  openProject: () => ipcRenderer.invoke(CHANNELS.openProject),
  getStatus: () => ipcRenderer.invoke(CHANNELS.getStatus),
  getProject: () => ipcRenderer.invoke(CHANNELS.getProject),
  getRaw: () => ipcRenderer.invoke(CHANNELS.getRaw),
  saveRaw: (content) => ipcRenderer.invoke(CHANNELS.saveRaw, content),
  updateMilestone: (id, fields) => ipcRenderer.invoke(CHANNELS.updateMilestone, id, fields),
  addMilestone: (milestone) => ipcRenderer.invoke(CHANNELS.addMilestone, milestone),
  deleteMilestone: (id) => ipcRenderer.invoke(CHANNELS.deleteMilestone, id),
  moveTask: (taskId, targetColumn, position) => ipcRenderer.invoke(CHANNELS.moveTask, taskId, targetColumn, position),
  updateTask: (id, fields) => ipcRenderer.invoke(CHANNELS.updateTask, id, fields),
  addTask: (task) => ipcRenderer.invoke(CHANNELS.addTask, task),
  deleteTask: (id) => ipcRenderer.invoke(CHANNELS.deleteTask, id),
  addColumn: (name) => ipcRenderer.invoke(CHANNELS.addColumn, name),
  renameColumn: (oldName, newName) => ipcRenderer.invoke(CHANNELS.renameColumn, oldName, newName),
  deleteColumn: (name) => ipcRenderer.invoke(CHANNELS.deleteColumn, name),
  updateTodo: (index, fields) => ipcRenderer.invoke(CHANNELS.updateTodo, index, fields),
  addTodo: (todo) => ipcRenderer.invoke(CHANNELS.addTodo, todo),
  deleteTodo: (index) => ipcRenderer.invoke(CHANNELS.deleteTodo, index),
  subscribeToChanges: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(CHANNELS.changed, listener);
    return () => ipcRenderer.removeListener(CHANNELS.changed, listener);
  },
};

contextBridge.exposeInMainWorld('projectMd', api);
