import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';

import parse from './parser.js';
import serialize from './serializer.js';

export class ProjectDocumentService extends EventEmitter {
  #projectFile = null;
  #watcher = null;
  #skipNextChange = false;

  getStatus() {
    return {
      loaded: this.#projectFile !== null,
      path: this.#projectFile,
      filename: this.#projectFile ? path.basename(this.#projectFile) : null,
    };
  }

  async openProject(filePath) {
    if (!filePath) {
      throw new Error('No project file selected');
    }

    this.#projectFile = filePath;
    await this.#watchFile(filePath);

    return {
      path: filePath,
      data: this.getProject(),
    };
  }

  getProject() {
    this.#requireProject();
    return parse(this.#readProjectFile());
  }

  getRaw() {
    this.#requireProject();
    return { content: this.#readProjectFile() };
  }

  saveRaw(content) {
    this.#requireProject();
    this.#writeRaw(content);
    return { ok: true };
  }

  updateMilestone(id, fields) {
    return this.#mutateProject((data) => {
      const milestone = data.milestones.find((item) => item.id === id);
      if (!milestone) {
        throw new Error(`Milestone not found: ${id}`);
      }
      const { name, target, status } = fields;
      if (name !== undefined) milestone.name = name;
      if (target !== undefined) milestone.target = target;
      if (status !== undefined) milestone.status = status;
    });
  }

  addMilestone(milestone) {
    return this.#mutateProject((data) => {
      data.milestones.push(milestone);
    });
  }

  deleteMilestone(id) {
    return this.#mutateProject((data) => {
      const index = data.milestones.findIndex((item) => item.id === id);
      if (index === -1) {
        throw new Error(`Milestone not found: ${id}`);
      }
      data.milestones.splice(index, 1);
    });
  }

  moveTask(taskId, targetColumn, position) {
    return this.#mutateProject((data) => {
      let task = null;
      let sourceColumnName = null;

      for (const column of data.kanban.columns) {
        const index = column.tasks.findIndex((item) => item.id === taskId);
        if (index !== -1) {
          task = column.tasks.splice(index, 1)[0];
          sourceColumnName = column.name;
          break;
        }
      }

      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      if (targetColumn === 'Done') {
        task.done = true;
      } else if (sourceColumnName === 'Done') {
        task.done = false;
      }

      const destination = data.kanban.columns.find((column) => column.name === targetColumn);
      if (!destination) {
        throw new Error(`Target column not found: ${targetColumn}`);
      }

      destination.tasks.splice(position, 0, task);
    });
  }

  updateTask(id, fields) {
    return this.#mutateProject((data) => {
      let task = null;

      for (const column of data.kanban.columns) {
        task = column.tasks.find((item) => item.id === id);
        if (task) {
          break;
        }
      }

      if (!task) {
        throw new Error(`Task not found: ${id}`);
      }

      const { title, milestone, done, assignee } = fields;
      if (title !== undefined) task.title = title;
      if (milestone !== undefined) task.milestone = milestone;
      if (done !== undefined) task.done = done;
      if (assignee !== undefined) task.assignee = assignee || null;
    });
  }

  addTask(task) {
    return this.#mutateProject((data) => {
      const column = data.kanban.columns.find((item) => item.name === task.column);
      if (!column) {
        throw new Error(`Column not found: ${task.column}`);
      }

      column.tasks.push({
        id: task.id,
        title: task.title,
        milestone: task.milestone,
        done: !!task.done,
        assignee: task.assignee || null,
      });
    });
  }

  deleteTask(id) {
    return this.#mutateProject((data) => {
      for (const column of data.kanban.columns) {
        const index = column.tasks.findIndex((item) => item.id === id);
        if (index !== -1) {
          column.tasks.splice(index, 1);
          return;
        }
      }

      throw new Error(`Task not found: ${id}`);
    });
  }

  addColumn(name) {
    return this.#mutateProject((data) => {
      data.kanban.columns.push({ name, tasks: [] });
    });
  }

  renameColumn(oldName, newName) {
    return this.#mutateProject((data) => {
      const column = data.kanban.columns.find((item) => item.name === oldName);
      if (!column) {
        throw new Error(`Column not found: ${oldName}`);
      }

      column.name = newName;
    });
  }

  deleteColumn(name) {
    this.#requireProject();
    const current = this.getProject();
    const column = current.kanban.columns.find((item) => item.name === name);

    if (!column) {
      throw new Error(`Column not found: ${name}`);
    }

    if (column.tasks.length > 0) {
      throw new Error(`Column "${name}" is not empty`);
    }

    return this.#mutateProject((data) => {
      const index = data.kanban.columns.findIndex((item) => item.name === name);
      data.kanban.columns.splice(index, 1);
    });
  }

  updateTodo(index, fields) {
    return this.#mutateProject((data) => {
      this.#assertTodoIndex(data, index);
      const item = data.todos.items[index];
      const { text, done, assignee } = fields;
      if (text !== undefined) item.text = text;
      if (done !== undefined) item.done = done;
      if (assignee !== undefined) item.assignee = assignee || null;
    });
  }

  addTodo(todo) {
    return this.#mutateProject((data) => {
      data.todos.items.push({
        text: todo.text,
        done: !!todo.done,
        assignee: todo.assignee || null,
      });
    });
  }

  deleteTodo(index) {
    return this.#mutateProject((data) => {
      this.#assertTodoIndex(data, index);
      data.todos.items.splice(index, 1);
    });
  }

  async dispose() {
    if (this.#watcher) {
      await this.#watcher.close();
      this.#watcher = null;
    }
  }

  #assertTodoIndex(data, index) {
    if (index < 0 || index >= data.todos.items.length) {
      throw new Error(`Todo index out of range: ${index}`);
    }
  }

  #mutateProject(mutate) {
    const data = this.getProject();
    mutate(data);
    this.#writeSerialized(data);
    return data;
  }

  #readProjectFile() {
    return fs.readFileSync(this.#projectFile, 'utf-8');
  }

  #writeSerialized(data) {
    this.#writeRaw(serialize(data));
  }

  #writeRaw(content) {
    const tmp = `${this.#projectFile}.tmp`;
    this.#skipNextChange = true;
    fs.writeFileSync(tmp, content, 'utf-8');
    fs.renameSync(tmp, this.#projectFile);
  }

  async #watchFile(filePath) {
    await this.dispose();
    this.#watcher = chokidar.watch(filePath, { ignoreInitial: true });
    this.#watcher.on('change', () => {
      if (this.#skipNextChange) {
        this.#skipNextChange = false;
        return;
      }

      this.emit('changed');
    });
  }

  #requireProject() {
    if (!this.#projectFile) {
      throw new Error('No project loaded');
    }
  }
}

export default ProjectDocumentService;
