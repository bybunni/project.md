<script>
  import { createEventDispatcher } from 'svelte';
  import { moveTask, updateTask, addTask, deleteTask, addColumn, renameColumn, deleteColumn } from '../lib/api.js';
  import KanbanCard from './KanbanCard.svelte';

  export let kanban = { columns: [] };
  const dispatch = createEventDispatcher();

  let dragOverColumn = null;
  let addingTaskColumn = null;
  let newTask = { id: '', title: '', milestone: '', assignee: '' };
  let editingColumnName = null;
  let columnNameValue = '';
  let showAddColumn = false;
  let newColumnName = '';

  async function handleDrop(e, columnName) {
    e.preventDefault();
    dragOverColumn = null;
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    const col = kanban.columns.find(c => c.name === columnName);
    const position = col ? col.tasks.length : 0;
    await moveTask(taskId, columnName, position);
    dispatch('change');
  }

  function handleDragOver(e, columnName) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverColumn = columnName;
  }

  function handleDragLeave(columnName) {
    if (dragOverColumn === columnName) dragOverColumn = null;
  }

  async function handleTaskUpdate(e) {
    await updateTask(e.detail.id, e.detail.fields);
    dispatch('change');
  }

  async function handleTaskDelete(e) {
    if (confirm(`Delete task ${e.detail.id}?`)) {
      await deleteTask(e.detail.id);
      dispatch('change');
    }
  }

  function openAddTask(columnName) {
    addingTaskColumn = columnName;
    newTask = { id: '', title: '', milestone: '' };
  }

  function cancelAddTask() {
    addingTaskColumn = null;
    newTask = { id: '', title: '', milestone: '', assignee: '' };
  }

  async function handleAddTask(columnName) {
    if (!newTask.id.trim() || !newTask.title.trim()) return;
    const payload = { id: newTask.id, title: newTask.title, milestone: newTask.milestone, column: columnName, done: false };
    if (newTask.assignee.trim()) payload.assignee = newTask.assignee.trim();
    await addTask(payload);
    newTask = { id: '', title: '', milestone: '', assignee: '' };
    addingTaskColumn = null;
    dispatch('change');
  }

  function handleAddTaskKeydown(e, columnName) {
    if (e.key === 'Enter') {
      handleAddTask(columnName);
    } else if (e.key === 'Escape') {
      cancelAddTask();
    }
  }

  async function handleAddColumn() {
    if (!newColumnName.trim()) return;
    await addColumn(newColumnName.trim());
    newColumnName = '';
    showAddColumn = false;
    dispatch('change');
  }

  function handleAddColumnKeydown(e) {
    if (e.key === 'Enter') {
      handleAddColumn();
    } else if (e.key === 'Escape') {
      showAddColumn = false;
      newColumnName = '';
    }
  }

  function startRenameColumn(name) {
    editingColumnName = name;
    columnNameValue = name;
  }

  async function saveColumnName(oldName) {
    editingColumnName = null;
    if (columnNameValue && columnNameValue !== oldName) {
      await renameColumn(oldName, columnNameValue);
      dispatch('change');
    }
  }

  function handleColumnNameKeydown(e, oldName) {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      editingColumnName = null;
    }
  }

  async function handleDeleteColumn(name) {
    const col = kanban.columns.find(c => c.name === name);
    if (col && col.tasks.length > 0) {
      alert('Cannot delete a column that has tasks. Move or delete tasks first.');
      return;
    }
    if (confirm(`Delete column "${name}"?`)) {
      await deleteColumn(name);
      dispatch('change');
    }
  }
</script>

<div class="kanban-board">
  <div class="columns-scroll">
    {#each kanban.columns as column (column.name)}
      <div
        class="kanban-column"
        class:drag-over={dragOverColumn === column.name}
        on:dragover={(e) => handleDragOver(e, column.name)}
        on:dragleave={() => handleDragLeave(column.name)}
        on:drop={(e) => handleDrop(e, column.name)}
        role="list"
        aria-label="Column: {column.name}"
      >
        <div class="column-header">
          {#if editingColumnName === column.name}
            <input
              class="column-name-edit"
              type="text"
              bind:value={columnNameValue}
              on:blur={() => saveColumnName(column.name)}
              on:keydown={(e) => handleColumnNameKeydown(e, column.name)}
              autofocus
            />
          {:else}
            <span
              class="column-name"
              on:click={() => startRenameColumn(column.name)}
              on:keydown={(e) => e.key === 'Enter' && startRenameColumn(column.name)}
              role="button"
              tabindex="0"
              title="Click to rename column"
            >
              {column.name}
            </span>
            <span class="task-count">{column.tasks.length}</span>
          {/if}
          <button
            class="column-delete-btn"
            on:click={() => handleDeleteColumn(column.name)}
            title="Delete column"
            aria-label="Delete column {column.name}"
          >
            &times;
          </button>
        </div>

        <div class="column-body">
          {#each column.tasks as task (task.id)}
            <KanbanCard
              {task}
              on:update={handleTaskUpdate}
              on:delete={handleTaskDelete}
            />
          {/each}

          {#if addingTaskColumn === column.name}
            <div class="add-task-form">
              <input
                class="add-task-input"
                type="text"
                bind:value={newTask.id}
                on:keydown={(e) => handleAddTaskKeydown(e, column.name)}
                placeholder="Task ID"
                autofocus
              />
              <input
                class="add-task-input"
                type="text"
                bind:value={newTask.title}
                on:keydown={(e) => handleAddTaskKeydown(e, column.name)}
                placeholder="Title"
              />
              <input
                class="add-task-input"
                type="text"
                bind:value={newTask.milestone}
                on:keydown={(e) => handleAddTaskKeydown(e, column.name)}
                placeholder="Milestone (optional)"
              />
              <input
                class="add-task-input"
                type="text"
                bind:value={newTask.assignee}
                on:keydown={(e) => handleAddTaskKeydown(e, column.name)}
                placeholder="Assignee (optional)"
              />
              <div class="add-task-actions">
                <button class="btn btn-primary" on:click={() => handleAddTask(column.name)}>
                  Add
                </button>
                <button class="btn btn-cancel" on:click={cancelAddTask}>
                  Cancel
                </button>
              </div>
            </div>
          {:else}
            <button class="add-task-btn" on:click={() => openAddTask(column.name)}>
              + Add task
            </button>
          {/if}
        </div>
      </div>
    {/each}

    <div class="add-column-area">
      {#if showAddColumn}
        <div class="add-column-form">
          <input
            class="add-column-input"
            type="text"
            bind:value={newColumnName}
            on:keydown={handleAddColumnKeydown}
            on:blur={() => { if (!newColumnName.trim()) showAddColumn = false; }}
            placeholder="Column name"
            autofocus
          />
          <div class="add-column-actions">
            <button class="btn btn-primary" on:click={handleAddColumn}>
              Add
            </button>
            <button class="btn btn-cancel" on:click={() => { showAddColumn = false; newColumnName = ''; }}>
              Cancel
            </button>
          </div>
        </div>
      {:else}
        <button class="add-column-btn" on:click={() => (showAddColumn = true)}>
          + Add column
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .kanban-board {
    width: 100%;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 16px;
    box-sizing: border-box;
  }

  .columns-scroll {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    min-height: 200px;
    padding-bottom: 16px;
  }

  .kanban-column {
    flex: 0 0 280px;
    background: var(--bg-surface-muted);
    border-radius: 12px;
    border: 2px solid transparent;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 120px);
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .kanban-column.drag-over {
    border-color: var(--accent);
    background: var(--bg-surface-info);
  }

  .column-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 12px 8px 12px;
    position: relative;
  }

  .column-name {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    cursor: pointer;
    flex: 1;
    letter-spacing: 0.01em;
    text-transform: uppercase;
  }

  .column-name:hover {
    color: var(--accent);
  }

  .column-name-edit {
    flex: 1;
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    border: 1px solid var(--accent);
    border-radius: 4px;
    padding: 4px 8px;
    outline: none;
    background: var(--input-bg);
    font-family: inherit;
    text-transform: uppercase;
  }

  .column-name-edit:focus {
    box-shadow: 0 0 0 2px var(--focus-ring);
  }

  .task-count {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    background: var(--bg-surface-emphasis);
    padding: 1px 8px;
    border-radius: 10px;
    min-width: 16px;
    text-align: center;
  }

  .column-delete-btn {
    border: none;
    background: transparent;
    color: var(--text-faint);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    border-radius: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
    padding: 0;
    flex-shrink: 0;
  }

  .kanban-column:hover .column-delete-btn {
    opacity: 1;
  }

  .column-delete-btn:hover {
    background: var(--danger-soft);
    color: var(--danger);
  }

  .column-body {
    padding: 4px 12px 12px 12px;
    overflow-y: auto;
    flex: 1;
  }

  /* Scrollbar styling for column body */
  .column-body::-webkit-scrollbar {
    width: 4px;
  }
  .column-body::-webkit-scrollbar-track {
    background: transparent;
  }
  .column-body::-webkit-scrollbar-thumb {
    background: var(--border-strong);
    border-radius: 2px;
  }

  .add-task-btn {
    width: 100%;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 500;
    padding: 8px 0;
    cursor: pointer;
    text-align: left;
    border-radius: 6px;
    transition: color 0.15s ease, background 0.15s ease;
    font-family: inherit;
  }

  .add-task-btn:hover {
    color: var(--accent);
    background: var(--bg-surface-emphasis);
    padding-left: 8px;
  }

  .add-task-form {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow: var(--shadow-sm);
  }

  .add-task-input {
    width: 100%;
    font-size: 13px;
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    border-radius: 6px;
    padding: 6px 8px;
    outline: none;
    background: var(--input-bg-subtle);
    box-sizing: border-box;
    font-family: inherit;
    transition: border-color 0.15s ease;
  }

  .add-task-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--focus-ring);
  }

  .add-task-input::placeholder {
    color: var(--text-faint);
  }

  .add-task-actions {
    display: flex;
    gap: 6px;
  }

  .btn {
    font-size: 13px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s ease;
  }

  .btn-primary {
    background: var(--accent);
    color: var(--accent-contrast);
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  .btn-cancel {
    background: var(--bg-surface-emphasis);
    color: var(--text-secondary);
  }

  .btn-cancel:hover {
    background: var(--bg-surface-hover);
  }

  .add-column-area {
    flex: 0 0 280px;
  }

  .add-column-btn {
    width: 280px;
    border: 2px dashed var(--border-strong);
    background: transparent;
    color: var(--text-muted);
    font-size: 14px;
    font-weight: 600;
    padding: 16px;
    cursor: pointer;
    border-radius: 12px;
    text-align: center;
    transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
    font-family: inherit;
  }

  .add-column-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--bg-surface-info);
  }

  .add-column-form {
    width: 280px;
    background: var(--bg-surface-muted);
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .add-column-input {
    width: 100%;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    border-radius: 6px;
    padding: 8px 10px;
    outline: none;
    background: var(--input-bg);
    box-sizing: border-box;
    font-family: inherit;
  }

  .add-column-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--focus-ring);
  }

  .add-column-actions {
    display: flex;
    gap: 6px;
  }
</style>
