import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import parse from '../lib/parser.js';
import serialize from '../lib/serializer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectMdPath = join(__dirname, '..', 'project.md');
const original = fs.readFileSync(projectMdPath, 'utf-8');
const data = parse(original);

describe('Round-trip fidelity', () => {
  it('serialize(parse(file)) produces byte-identical output', () => {
    const result = serialize(data);
    assert.strictEqual(result, original);
  });
});

describe('Parse title', () => {
  it('extracts the project title', () => {
    assert.strictEqual(data.title, 'Website Redesign');
  });
});

describe('Parse milestones', () => {
  it('parses the correct number of milestones', () => {
    assert.strictEqual(data.milestones.length, 3);
  });

  it('parses fields of the first milestone', () => {
    const m = data.milestones[0];
    assert.strictEqual(m.id, 'M1');
    assert.strictEqual(m.name, 'Design Approval');
    assert.strictEqual(m.target, '2025-07-11');
    assert.strictEqual(m.status, 'In Progress');
  });
});

describe('Parse kanban', () => {
  it('parses the correct number of columns', () => {
    assert.strictEqual(data.kanban.columns.length, 4);
  });

  it('parses column names', () => {
    const names = data.kanban.columns.map(c => c.name);
    assert.deepStrictEqual(names, ['Backlog', 'In Progress', 'In Review', 'Done']);
  });

  it('parses task fields correctly', () => {
    const task = data.kanban.columns[0].tasks[0];
    assert.strictEqual(task.id, 'WR-07');
    assert.strictEqual(task.title, 'Set up analytics integration');
    assert.strictEqual(task.milestone, 'M3');
    assert.strictEqual(task.done, false);
  });

  it('parses done state correctly', () => {
    const doneColumn = data.kanban.columns[3];
    assert.strictEqual(doneColumn.name, 'Done');
    for (const task of doneColumn.tasks) {
      assert.strictEqual(task.done, true);
    }
  });

  it('parses kanban task with assignee', () => {
    const task = data.kanban.columns[0].tasks[0]; // WR-07 in "Backlog"
    assert.strictEqual(task.id, 'WR-07');
    assert.strictEqual(task.assignee, 'alex.smith');
  });

  it('parses kanban task without assignee as null', () => {
    const task = data.kanban.columns[0].tasks[1]; // WR-08 in "Backlog"
    assert.strictEqual(task.assignee, null);
  });
});

describe('Parse todos', () => {
  it('parses the description text', () => {
    assert.strictEqual(data.todos.description, 'Quick tasks and reminders not tied to a kanban issue.');
  });

  it('parses the correct number of items', () => {
    assert.strictEqual(data.todos.items.length, 4);
  });

  it('parses done states correctly', () => {
    const doneStates = data.todos.items.map(i => i.done);
    assert.deepStrictEqual(doneStates, [false, false, true, false]);
  });

  it('parses todo with assignee', () => {
    const item = data.todos.items[0]; // "Schedule kickoff meeting..."
    assert.strictEqual(item.assignee, 'john.doe');
  });

  it('parses todo without assignee as null', () => {
    const item = data.todos.items[2]; // "Create shared Drive folder"
    assert.strictEqual(item.assignee, null);
  });
});
