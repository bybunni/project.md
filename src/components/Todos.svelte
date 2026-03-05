<script>
  import { createEventDispatcher } from 'svelte';
  import { updateTodo, addTodo, deleteTodo } from '../lib/api.js';

  export let todos = { description: '', items: [] };
  const dispatch = createEventDispatcher();

  let editingIndex = -1;
  let editValue = '';
  let editingAssigneeIndex = -1;
  let assigneeValue = '';
  let newTodoText = '';
  let newTodoAssignee = '';

  async function toggleDone(index, currentDone) {
    await updateTodo(index, { done: !currentDone });
    dispatch('change');
  }

  function startEdit(index, text) {
    editingIndex = index;
    editValue = text;
  }

  async function saveEdit(index) {
    if (editingIndex === -1) return;
    editingIndex = -1;
    await updateTodo(index, { text: editValue });
    dispatch('change');
  }

  function handleEditKeydown(e, index) {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  }

  function startEditAssignee(index, assignee) {
    editingAssigneeIndex = index;
    assigneeValue = assignee || '';
  }

  async function saveAssignee(index) {
    if (editingAssigneeIndex === -1) return;
    editingAssigneeIndex = -1;
    const newVal = assigneeValue.trim() || null;
    await updateTodo(index, { assignee: newVal });
    dispatch('change');
  }

  function handleAssigneeKeydown(e, index) {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      editingAssigneeIndex = -1;
    }
  }

  async function handleDelete(index) {
    await deleteTodo(index);
    dispatch('change');
  }

  async function handleAdd() {
    if (!newTodoText.trim()) return;
    const payload = { text: newTodoText.trim(), done: false };
    if (newTodoAssignee.trim()) payload.assignee = newTodoAssignee.trim();
    await addTodo(payload);
    newTodoText = '';
    newTodoAssignee = '';
    dispatch('change');
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') handleAdd();
  }
</script>

<div class="todos-container">
  {#if todos.description}
    <p class="description">{todos.description}</p>
  {/if}

  <ul class="todo-list">
    {#each todos.items as item, index (index)}
      <li class="todo-item" class:done={item.done}>
        <label class="checkbox-wrapper">
          <input
            type="checkbox"
            checked={item.done}
            on:change={() => toggleDone(index, item.done)}
          />
          <span class="checkmark"></span>
        </label>

        {#if editingIndex === index}
          <input
            class="edit-input"
            type="text"
            bind:value={editValue}
            on:blur={() => saveEdit(index)}
            on:keydown={(e) => handleEditKeydown(e, index)}
            autofocus
          />
        {:else}
          <span
            class="todo-text"
            class:strikethrough={item.done}
            on:click={() => startEdit(index, item.text)}
            on:keydown={() => {}}
            role="button"
            tabindex="0"
          >
            {item.text}
          </span>
        {/if}

        {#if editingAssigneeIndex === index}
          <input
            class="assignee-input"
            type="text"
            bind:value={assigneeValue}
            on:blur={() => saveAssignee(index)}
            on:keydown={(e) => handleAssigneeKeydown(e, index)}
            autofocus
            placeholder="person.name"
          />
        {:else if item.assignee}
          <span
            class="assignee-badge"
            on:click={() => startEditAssignee(index, item.assignee)}
            on:keydown={() => {}}
            role="button"
            tabindex="0"
            title="Click to edit assignee"
          >
            @{item.assignee}
          </span>
        {:else}
          <span
            class="add-assignee"
            on:click={() => startEditAssignee(index, '')}
            on:keydown={() => {}}
            role="button"
            tabindex="0"
          >
            + assign
          </span>
        {/if}

        <button
          class="delete-btn"
          on:click={() => handleDelete(index)}
          title="Delete todo"
        >
          &times;
        </button>
      </li>
    {/each}
  </ul>

  <div class="add-todo">
    <input
      class="add-input"
      type="text"
      placeholder="Add a new todo..."
      bind:value={newTodoText}
      on:keydown={handleKeydown}
    />
    <input
      class="add-input assignee-add-input"
      type="text"
      placeholder="Assignee (optional)"
      bind:value={newTodoAssignee}
      on:keydown={handleKeydown}
    />
    <button class="add-btn" on:click={handleAdd} disabled={!newTodoText.trim()}>
      Add
    </button>
  </div>
</div>

<style>
  .todos-container {
    width: 100%;
  }

  .description {
    color: #6b7280;
    font-size: 0.9rem;
    margin: 0 0 1rem 0;
    line-height: 1.5;
  }

  .todo-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .todo-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.25rem;
    border-bottom: 1px solid #f0f0f0;
    transition: background-color 0.15s ease;
  }

  .todo-item:hover {
    background-color: #fafafa;
  }

  .todo-item.done {
    opacity: 0.55;
  }

  /* Custom checkbox */
  .checkbox-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    cursor: pointer;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .checkbox-wrapper input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .checkmark {
    width: 18px;
    height: 18px;
    border: 2px solid #d1d5db;
    border-radius: 4px;
    transition: all 0.15s ease;
  }

  .checkbox-wrapper input:checked ~ .checkmark {
    background-color: #3b82f6;
    border-color: #3b82f6;
  }

  .checkbox-wrapper input:checked ~ .checkmark::after {
    content: '';
    position: absolute;
    left: 6px;
    top: 2px;
    width: 5px;
    height: 10px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  .checkbox-wrapper:hover .checkmark {
    border-color: #9ca3af;
  }

  .todo-text {
    flex: 1;
    cursor: pointer;
    padding: 0.15rem 0.25rem;
    border-radius: 3px;
    font-size: 0.95rem;
    line-height: 1.4;
  }

  .todo-text:hover {
    background-color: #f3f4f6;
  }

  .todo-text.strikethrough {
    text-decoration: line-through;
  }

  .edit-input {
    flex: 1;
    font-size: 0.95rem;
    padding: 0.2rem 0.35rem;
    border: 1px solid #3b82f6;
    border-radius: 3px;
    outline: none;
    line-height: 1.4;
    font-family: inherit;
  }

  .delete-btn {
    opacity: 0;
    background: none;
    border: none;
    color: #ef4444;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    line-height: 1;
    flex-shrink: 0;
    transition: opacity 0.15s ease, background-color 0.15s ease;
  }

  .todo-item:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    background-color: #fee2e2;
  }

  .add-todo {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
  }

  .add-input {
    flex: 1;
    padding: 0.45rem 0.6rem;
    border: 1px solid #e5e7eb;
    border-radius: 5px;
    font-size: 0.9rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .add-input:focus {
    border-color: #93c5fd;
  }

  .add-input::placeholder {
    color: #9ca3af;
  }

  .add-btn {
    padding: 0.45rem 1rem;
    background-color: #3b82f6;
    color: #fff;
    border: none;
    border-radius: 5px;
    font-size: 0.9rem;
    cursor: pointer;
    font-family: inherit;
    transition: background-color 0.15s ease;
  }

  .add-btn:hover:not(:disabled) {
    background-color: #2563eb;
  }

  .add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .assignee-badge {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 600;
    background: #ede9fe;
    color: #7c3aed;
    padding: 1px 8px;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s ease;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .assignee-badge:hover {
    background: #ddd6fe;
  }

  .assignee-input {
    width: 100px;
    font-size: 0.8rem;
    padding: 1px 6px;
    border: 1px solid #7c3aed;
    border-radius: 3px;
    outline: none;
    font-family: inherit;
    flex-shrink: 0;
  }

  .add-assignee {
    font-size: 0.75rem;
    color: #94a3b8;
    cursor: pointer;
    transition: color 0.15s ease, opacity 0.15s ease;
    opacity: 0;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .todo-item:hover .add-assignee {
    opacity: 1;
  }

  .add-assignee:hover {
    color: #7c3aed;
  }

  .assignee-add-input {
    max-width: 140px;
  }
</style>
