// Fetch full project data
export async function fetchProject() {
  const res = await fetch('/api/project');
  return res.json();
}

// Milestones
export async function updateMilestone(id, fields) {
  const res = await fetch(`/api/project/milestones/${id}`, {
    method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(fields)
  });
  return res.json();
}
export async function addMilestone(milestone) {
  const res = await fetch('/api/project/milestones', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(milestone)
  });
  return res.json();
}
export async function deleteMilestone(id) {
  const res = await fetch(`/api/project/milestones/${id}`, { method: 'DELETE' });
  return res.json();
}

// Kanban
export async function moveTask(taskId, targetColumn, position) {
  const res = await fetch('/api/project/kanban/move', {
    method: 'PATCH', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ taskId, targetColumn, position })
  });
  return res.json();
}
export async function updateTask(id, fields) {
  const res = await fetch(`/api/project/kanban/${id}`, {
    method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(fields)
  });
  return res.json();
}
export async function addTask(task) {
  const res = await fetch('/api/project/kanban', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(task)
  });
  return res.json();
}
export async function deleteTask(id) {
  const res = await fetch(`/api/project/kanban/${id}`, { method: 'DELETE' });
  return res.json();
}
export async function addColumn(name) {
  const res = await fetch('/api/project/kanban/columns', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name })
  });
  return res.json();
}
export async function renameColumn(oldName, newName) {
  const res = await fetch(`/api/project/kanban/columns/${encodeURIComponent(oldName)}`, {
    method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name: newName })
  });
  return res.json();
}
export async function deleteColumn(name) {
  const res = await fetch(`/api/project/kanban/columns/${encodeURIComponent(name)}`, { method: 'DELETE' });
  return res.json();
}

// Todos
export async function updateTodo(index, fields) {
  const res = await fetch(`/api/project/todos/${index}`, {
    method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(fields)
  });
  return res.json();
}
export async function addTodo(todo) {
  const res = await fetch('/api/project/todos', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(todo)
  });
  return res.json();
}
export async function deleteTodo(index) {
  const res = await fetch(`/api/project/todos/${index}`, { method: 'DELETE' });
  return res.json();
}

// Raw
export async function fetchRaw() {
  const res = await fetch('/api/project/raw');
  return res.json();
}
export async function saveRaw(content) {
  const res = await fetch('/api/project/raw', {
    method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ content })
  });
  return res.json();
}

// SSE
export function listenForChanges(callback) {
  const source = new EventSource('/api/events');
  source.onmessage = () => callback();
  return source;
}
