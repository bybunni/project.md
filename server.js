import express from 'express';
import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import parse from './lib/parser.js';
import serialize from './lib/serializer.js';

const PROJECT_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'project.md');

const app = express();
app.use(express.json());

// --- Helper functions ---

let skipNextChange = false;

function readProject() {
  const content = fs.readFileSync(PROJECT_FILE, 'utf-8');
  return parse(content);
}

function writeProject(data) {
  const serialized = serialize(data);
  const tmp = PROJECT_FILE + '.tmp';
  skipNextChange = true;
  fs.writeFileSync(tmp, serialized, 'utf-8');
  fs.renameSync(tmp, PROJECT_FILE);
}

function mutateProject(fn) {
  const data = readProject();
  fn(data);
  writeProject(data);
  return data;
}

// --- SSE ---

const clients = new Set();

app.get('/api/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();

  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
  });
});

const watcher = chokidar.watch(PROJECT_FILE, { ignoreInitial: true });
watcher.on('change', () => {
  if (skipNextChange) {
    skipNextChange = false;
    return;
  }
  for (const client of clients) {
    client.write('data: changed\n\n');
  }
});

// --- API Routes ---

// GET /api/project - read project data
app.get('/api/project', (req, res) => {
  try {
    const data = readProject();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/project/raw - raw markdown
app.get('/api/project/raw', (req, res) => {
  try {
    const content = fs.readFileSync(PROJECT_FILE, 'utf-8');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/project/raw - overwrite with raw markdown
app.put('/api/project/raw', (req, res) => {
  try {
    const { content } = req.body;
    const tmp = PROJECT_FILE + '.tmp';
    skipNextChange = true;
    fs.writeFileSync(tmp, content, 'utf-8');
    fs.renameSync(tmp, PROJECT_FILE);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Milestone routes ---

// PATCH /api/project/milestones/:id - update milestone fields
app.patch('/api/project/milestones/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, target, status } = req.body;
    const data = mutateProject((d) => {
      const milestone = d.milestones.find((m) => m.id === id);
      if (!milestone) throw new Error(`Milestone not found: ${id}`);
      if (name !== undefined) milestone.name = name;
      if (target !== undefined) milestone.target = target;
      if (status !== undefined) milestone.status = status;
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/milestones - add milestone
app.post('/api/project/milestones', (req, res) => {
  try {
    const { id, name, target, status } = req.body;
    const data = mutateProject((d) => {
      d.milestones.push({ id, name, target, status });
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/project/milestones/:id - remove milestone
app.delete('/api/project/milestones/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = mutateProject((d) => {
      const idx = d.milestones.findIndex((m) => m.id === id);
      if (idx === -1) throw new Error(`Milestone not found: ${id}`);
      d.milestones.splice(idx, 1);
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Kanban column routes (must come before /kanban/:id to avoid route conflicts) ---

// POST /api/project/kanban/columns - add column
app.post('/api/project/kanban/columns', (req, res) => {
  try {
    const { name } = req.body;
    const data = mutateProject((d) => {
      d.kanban.columns.push({ name, tasks: [] });
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/project/kanban/columns/:name - rename column
app.patch('/api/project/kanban/columns/:name', (req, res) => {
  try {
    const oldName = req.params.name;
    const { name: newName } = req.body;
    const data = mutateProject((d) => {
      const col = d.kanban.columns.find((c) => c.name === oldName);
      if (!col) throw new Error(`Column not found: ${oldName}`);
      col.name = newName;
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/project/kanban/columns/:name - delete column (must be empty)
app.delete('/api/project/kanban/columns/:name', (req, res) => {
  try {
    const { name } = req.params;
    const data = readProject();
    const col = data.kanban.columns.find((c) => c.name === name);
    if (!col) {
      return res.status(400).json({ error: `Column not found: ${name}` });
    }
    if (col.tasks.length > 0) {
      return res.status(400).json({ error: `Column "${name}" is not empty` });
    }
    const result = mutateProject((d) => {
      const idx = d.kanban.columns.findIndex((c) => c.name === name);
      d.kanban.columns.splice(idx, 1);
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Kanban task routes ---

// PATCH /api/project/kanban/move - move task between columns
app.patch('/api/project/kanban/move', (req, res) => {
  try {
    const { taskId, targetColumn, position } = req.body;
    const data = mutateProject((d) => {
      // Find and remove task from its current column
      let task = null;
      let sourceColumnName = null;
      for (const col of d.kanban.columns) {
        const idx = col.tasks.findIndex((t) => t.id === taskId);
        if (idx !== -1) {
          task = col.tasks.splice(idx, 1)[0];
          sourceColumnName = col.name;
          break;
        }
      }
      if (!task) throw new Error(`Task not found: ${taskId}`);

      // Auto-set done based on target column
      if (targetColumn === 'Done') {
        task.done = true;
      } else if (sourceColumnName === 'Done') {
        task.done = false;
      }

      // Insert into target column at position
      const target = d.kanban.columns.find((c) => c.name === targetColumn);
      if (!target) throw new Error(`Target column not found: ${targetColumn}`);
      target.tasks.splice(position, 0, task);
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/project/kanban/:id - update task fields
app.patch('/api/project/kanban/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, milestone, done, assignee } = req.body;
    const data = mutateProject((d) => {
      let task = null;
      for (const col of d.kanban.columns) {
        task = col.tasks.find((t) => t.id === id);
        if (task) break;
      }
      if (!task) throw new Error(`Task not found: ${id}`);
      if (title !== undefined) task.title = title;
      if (milestone !== undefined) task.milestone = milestone;
      if (done !== undefined) task.done = done;
      if (assignee !== undefined) task.assignee = assignee || null;
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/kanban - add task
app.post('/api/project/kanban', (req, res) => {
  try {
    const { column, id, title, milestone, done, assignee } = req.body;
    const data = mutateProject((d) => {
      const col = d.kanban.columns.find((c) => c.name === column);
      if (!col) throw new Error(`Column not found: ${column}`);
      col.tasks.push({ id, title, milestone, done: !!done, assignee: assignee || null });
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/project/kanban/:id - remove task
app.delete('/api/project/kanban/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = mutateProject((d) => {
      for (const col of d.kanban.columns) {
        const idx = col.tasks.findIndex((t) => t.id === id);
        if (idx !== -1) {
          col.tasks.splice(idx, 1);
          return;
        }
      }
      throw new Error(`Task not found: ${id}`);
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Todo routes ---

// PATCH /api/project/todos/:index - update todo
app.patch('/api/project/todos/:index', (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const { text, done, assignee } = req.body;
    const data = mutateProject((d) => {
      if (index < 0 || index >= d.todos.items.length) {
        throw new Error(`Todo index out of range: ${index}`);
      }
      if (text !== undefined) d.todos.items[index].text = text;
      if (done !== undefined) d.todos.items[index].done = done;
      if (assignee !== undefined) d.todos.items[index].assignee = assignee || null;
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project/todos - add todo
app.post('/api/project/todos', (req, res) => {
  try {
    const { text, done, assignee } = req.body;
    const data = mutateProject((d) => {
      d.todos.items.push({ text, done: !!done, assignee: assignee || null });
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/project/todos/:index - remove todo
app.delete('/api/project/todos/:index', (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const data = mutateProject((d) => {
      if (index < 0 || index >= d.todos.items.length) {
        throw new Error(`Todo index out of range: ${index}`);
      }
      d.todos.items.splice(index, 1);
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Vite dev server (after API routes) ---

const vite = await import('vite');
const viteServer = await vite.createServer({ server: { middlewareMode: true } });
app.use(viteServer.middlewares);

app.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});
