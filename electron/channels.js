export const CHANNELS = {
  openProject: 'project-md:open-project',
  createProject: 'project-md:create-project',
  getStatus: 'project-md:get-status',
  getProject: 'project-md:get-project',
  getRaw: 'project-md:get-raw',
  saveRaw: 'project-md:save-raw',
  updateMilestone: 'project-md:update-milestone',
  addMilestone: 'project-md:add-milestone',
  deleteMilestone: 'project-md:delete-milestone',
  moveTask: 'project-md:move-task',
  updateTask: 'project-md:update-task',
  addTask: 'project-md:add-task',
  deleteTask: 'project-md:delete-task',
  addColumn: 'project-md:add-column',
  renameColumn: 'project-md:rename-column',
  deleteColumn: 'project-md:delete-column',
  updateTodo: 'project-md:update-todo',
  addTodo: 'project-md:add-todo',
  deleteTodo: 'project-md:delete-todo',
  changed: 'project-md:changed',
};

export const OPEN_DIALOG_FILTERS = [
  { name: 'Markdown Files', extensions: ['md', 'markdown', 'txt'] },
  { name: 'All Files', extensions: ['*'] },
];
