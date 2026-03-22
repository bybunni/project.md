function getRuntime() {
  if (!window.projectMd) {
    throw new Error('project.md desktop bridge is unavailable');
  }

  return window.projectMd;
}

// Fetch full project data
export async function fetchProject() {
  return getRuntime().getProject();
}

// Open a project file via native OS dialog
export async function openProject() {
  return getRuntime().openProject();
}

// Check if a project is currently loaded
export async function fetchStatus() {
  return getRuntime().getStatus();
}

// Milestones
export async function updateMilestone(id, fields) {
  return getRuntime().updateMilestone(id, fields);
}
export async function addMilestone(milestone) {
  return getRuntime().addMilestone(milestone);
}
export async function deleteMilestone(id) {
  return getRuntime().deleteMilestone(id);
}

// Kanban
export async function moveTask(taskId, targetColumn, position) {
  return getRuntime().moveTask(taskId, targetColumn, position);
}
export async function updateTask(id, fields) {
  return getRuntime().updateTask(id, fields);
}
export async function addTask(task) {
  return getRuntime().addTask(task);
}
export async function deleteTask(id) {
  return getRuntime().deleteTask(id);
}
export async function addColumn(name) {
  return getRuntime().addColumn(name);
}
export async function renameColumn(oldName, newName) {
  return getRuntime().renameColumn(oldName, newName);
}
export async function deleteColumn(name) {
  return getRuntime().deleteColumn(name);
}

// Todos
export async function updateTodo(index, fields) {
  return getRuntime().updateTodo(index, fields);
}
export async function addTodo(todo) {
  return getRuntime().addTodo(todo);
}
export async function deleteTodo(index) {
  return getRuntime().deleteTodo(index);
}

// Raw
export async function fetchRaw() {
  return getRuntime().getRaw();
}
export async function saveRaw(content) {
  return getRuntime().saveRaw(content);
}

// Watch for external file changes
export function listenForChanges(callback) {
  const unsubscribe = getRuntime().subscribeToChanges(callback);
  return {
    close() {
      unsubscribe();
    },
  };
}
