<script>
  import { createEventDispatcher } from 'svelte';
  export let task;
  const dispatch = createEventDispatcher();

  let editingTitle = false;
  let editingMilestone = false;
  let editingAssignee = false;
  let titleValue = '';
  let milestoneValue = '';
  let assigneeValue = '';

  function startEditTitle() {
    if (task.done) return;
    editingTitle = true;
    titleValue = task.title;
  }

  function saveTitle() {
    editingTitle = false;
    if (titleValue !== task.title) {
      dispatch('update', { id: task.id, fields: { title: titleValue } });
    }
  }

  function handleTitleKeydown(e) {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      editingTitle = false;
    }
  }

  function startEditMilestone() {
    if (task.done) return;
    editingMilestone = true;
    milestoneValue = task.milestone || '';
  }

  function saveMilestone() {
    editingMilestone = false;
    if (milestoneValue !== task.milestone) {
      dispatch('update', { id: task.id, fields: { milestone: milestoneValue } });
    }
  }

  function handleMilestoneKeydown(e) {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      editingMilestone = false;
    }
  }

  function startEditAssignee() {
    if (task.done) return;
    editingAssignee = true;
    assigneeValue = task.assignee || '';
  }

  function saveAssignee() {
    editingAssignee = false;
    const newVal = assigneeValue.trim() || null;
    if (newVal !== (task.assignee || null)) {
      dispatch('update', { id: task.id, fields: { assignee: newVal } });
    }
  }

  function handleAssigneeKeydown(e) {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      editingAssignee = false;
    }
  }

  function handleDelete() {
    dispatch('delete', { id: task.id });
  }

  function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  }
</script>

<div
  class="kanban-card"
  class:done={task.done}
  draggable="true"
  on:dragstart={handleDragStart}
  role="listitem"
>
  <button class="delete-btn" on:click|stopPropagation={handleDelete} title="Delete task" aria-label="Delete task {task.id}">
    &times;
  </button>

  <div class="card-header">
    <span class="id-badge">{task.id}</span>
    {#if task.done}
      <span class="done-check" title="Completed">&#10003;</span>
    {/if}
  </div>

  <div class="card-title">
    {#if editingTitle}
      <input
        class="inline-edit"
        type="text"
        bind:value={titleValue}
        on:blur={saveTitle}
        on:keydown={handleTitleKeydown}
        autofocus
      />
    {:else}
      <span
        class="title-text"
        class:strikethrough={task.done}
        on:click={startEditTitle}
        on:keydown={(e) => e.key === 'Enter' && startEditTitle()}
        role="button"
        tabindex="0"
        title="Click to edit title"
      >
        {task.title}
      </span>
    {/if}
  </div>

  <div class="card-footer">
    {#if editingMilestone}
      <input
        class="inline-edit milestone-edit"
        type="text"
        bind:value={milestoneValue}
        on:blur={saveMilestone}
        on:keydown={handleMilestoneKeydown}
        autofocus
        placeholder="Milestone"
      />
    {:else if task.milestone}
      <span
        class="milestone-badge"
        on:click={startEditMilestone}
        on:keydown={(e) => e.key === 'Enter' && startEditMilestone()}
        role="button"
        tabindex="0"
        title="Click to edit milestone"
      >
        {task.milestone}
      </span>
    {:else}
      <span
        class="add-milestone"
        on:click={startEditMilestone}
        on:keydown={(e) => e.key === 'Enter' && startEditMilestone()}
        role="button"
        tabindex="0"
      >
        + milestone
      </span>
    {/if}

    {#if editingAssignee}
      <input
        class="inline-edit assignee-edit"
        type="text"
        bind:value={assigneeValue}
        on:blur={saveAssignee}
        on:keydown={handleAssigneeKeydown}
        autofocus
        placeholder="person.name"
      />
    {:else if task.assignee}
      <span
        class="assignee-badge"
        on:click={startEditAssignee}
        on:keydown={(e) => e.key === 'Enter' && startEditAssignee()}
        role="button"
        tabindex="0"
        title="Click to edit assignee"
      >
        @{task.assignee}
      </span>
    {:else}
      <span
        class="add-assignee"
        on:click={startEditAssignee}
        on:keydown={(e) => e.key === 'Enter' && startEditAssignee()}
        role="button"
        tabindex="0"
      >
        + assign
      </span>
    {/if}
  </div>
</div>

<style>
  .kanban-card {
    position: relative;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 8px;
    box-shadow: var(--shadow-sm);
    cursor: grab;
    transition: box-shadow 0.15s ease, opacity 0.15s ease;
    user-select: none;
  }

  .kanban-card:hover {
    box-shadow: var(--shadow-md);
  }

  .kanban-card:active {
    cursor: grabbing;
    box-shadow: var(--shadow-lg);
  }

  .kanban-card.done {
    opacity: 0.55;
  }

  .delete-btn {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
    color: var(--text-faint);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
    padding: 0;
  }

  .kanban-card:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    background: var(--danger-soft);
    color: var(--danger);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }

  .id-badge {
    display: inline-block;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
    font-size: 11px;
    font-weight: 600;
    background: var(--id-badge-bg);
    color: var(--id-badge-text);
    padding: 2px 6px;
    border-radius: 4px;
    letter-spacing: 0.02em;
  }

  .done-check {
    color: var(--success);
    font-size: 14px;
    font-weight: 700;
  }

  .card-title {
    margin-bottom: 8px;
  }

  .title-text {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.4;
    cursor: text;
    display: block;
    word-wrap: break-word;
  }

  .title-text:hover {
    color: var(--accent);
  }

  .title-text.strikethrough {
    text-decoration: line-through;
    color: var(--text-faint);
  }

  .inline-edit {
    width: 100%;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    border: 1px solid var(--accent);
    border-radius: 4px;
    padding: 4px 6px;
    outline: none;
    background: var(--input-bg-subtle);
    box-sizing: border-box;
    font-family: inherit;
  }

  .inline-edit:focus {
    box-shadow: 0 0 0 2px var(--focus-ring);
  }

  .milestone-edit {
    font-size: 12px;
    padding: 2px 6px;
  }

  .card-footer {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .milestone-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    background: var(--milestone-bg);
    color: var(--milestone-text);
    padding: 2px 8px;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s ease;
    white-space: nowrap;
  }

  .milestone-badge:hover {
    background: var(--milestone-bg-hover);
  }

  .add-milestone {
    font-size: 11px;
    color: var(--text-faint);
    cursor: pointer;
    transition: color 0.15s ease;
  }

  .add-milestone:hover {
    color: var(--accent);
  }

  .assignee-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    background: var(--assignee-bg);
    color: var(--assignee-text);
    padding: 2px 8px;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s ease;
    white-space: nowrap;
  }

  .assignee-badge:hover {
    background: var(--assignee-bg-hover);
  }

  .assignee-edit {
    font-size: 12px;
    padding: 2px 6px;
    max-width: 100px;
  }

  .add-assignee {
    font-size: 11px;
    color: var(--text-faint);
    cursor: pointer;
    transition: color 0.15s ease;
    opacity: 0;
  }

  .kanban-card:hover .add-assignee {
    opacity: 1;
  }

  .add-assignee:hover {
    color: var(--assignee-text);
  }
</style>
