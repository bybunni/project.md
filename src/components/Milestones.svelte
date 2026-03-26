<script>
  import { createEventDispatcher } from 'svelte';
  import { updateMilestone, addMilestone, deleteMilestone } from '../lib/api.js';

  export let milestones = [];
  export let kanban = { columns: [] };

  const dispatch = createEventDispatcher();

  // editing state
  let editingCell = null; // { id, field }
  let editValue = '';

  // new milestone form
  let newMilestone = { id: '', name: '', target: '', status: 'Not Started' };

  const statusOptions = ['Not Started', 'In Progress', 'Complete'];

  function getProgress(milestoneId) {
    let total = 0, done = 0;
    for (const col of kanban.columns) {
      for (const task of col.tasks) {
        if (task.milestone === milestoneId) {
          total++;
          if (task.done) done++;
        }
      }
    }
    return { done, total };
  }

  function startEdit(id, field, currentValue) {
    editingCell = { id, field };
    editValue = currentValue;
  }

  async function saveEdit(id, field) {
    editingCell = null;
    await updateMilestone(id, { [field]: editValue });
    dispatch('change');
  }

  async function handleStatusChange(id, newStatus) {
    await updateMilestone(id, { status: newStatus });
    dispatch('change');
  }

  async function handleDateChange(id, newDate) {
    await updateMilestone(id, { target: newDate });
    dispatch('change');
  }

  async function handleDelete(id) {
    if (confirm(`Delete milestone ${id}?`)) {
      await deleteMilestone(id);
      dispatch('change');
    }
  }

  async function handleAdd() {
    if (!newMilestone.id || !newMilestone.name) return;
    await addMilestone(newMilestone);
    newMilestone = { id: '', name: '', target: '', status: 'Not Started' };
    dispatch('change');
  }

  function handleKeydown(e, id, field) {
    if (e.key === 'Enter') {
      e.target.blur();
    } else if (e.key === 'Escape') {
      editingCell = null;
    }
  }

  function handleAddKeydown(e) {
    if (e.key === 'Enter') {
      handleAdd();
    }
  }
</script>

<div class="milestones-wrapper">
  <table>
    <thead>
      <tr>
        <th class="col-id">ID</th>
        <th class="col-name">Milestone</th>
        <th class="col-target">Target</th>
        <th class="col-status">Status</th>
        <th class="col-progress">Progress</th>
        <th class="col-actions">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each milestones as ms, i (ms.id)}
        {@const progress = getProgress(ms.id)}
        <tr class:alt={i % 2 === 1}>
          <td class="col-id">{ms.id}</td>

          <!-- Name: inline edit -->
          <td class="col-name">
            {#if editingCell && editingCell.id === ms.id && editingCell.field === 'name'}
              <input
                type="text"
                class="inline-input"
                bind:value={editValue}
                on:blur={() => saveEdit(ms.id, 'name')}
                on:keydown={(e) => handleKeydown(e, ms.id, 'name')}
                autofocus
              />
            {:else}
              <span
                class="editable"
                on:click={() => startEdit(ms.id, 'name', ms.name)}
                on:keydown={() => {}}
                role="button"
                tabindex="0"
              >
                {ms.name}
              </span>
            {/if}
          </td>

          <!-- Target: inline date edit -->
          <td class="col-target">
            {#if editingCell && editingCell.id === ms.id && editingCell.field === 'target'}
              <input
                type="date"
                class="inline-input"
                bind:value={editValue}
                on:blur={() => saveEdit(ms.id, 'target')}
                on:change={() => saveEdit(ms.id, 'target')}
                autofocus
              />
            {:else}
              <span
                class="editable"
                on:click={() => startEdit(ms.id, 'target', ms.target)}
                on:keydown={() => {}}
                role="button"
                tabindex="0"
              >
                {ms.target || '--'}
              </span>
            {/if}
          </td>

          <!-- Status: inline dropdown -->
          <td class="col-status">
            {#if editingCell && editingCell.id === ms.id && editingCell.field === 'status'}
              <select
                class="inline-select"
                bind:value={editValue}
                on:change={() => saveEdit(ms.id, 'status')}
                on:blur={() => { editingCell = null; }}
                autofocus
              >
                {#each statusOptions as opt}
                  <option value={opt}>{opt}</option>
                {/each}
              </select>
            {:else}
              <span
                class="editable status-badge"
                class:status-not-started={ms.status === 'Not Started'}
                class:status-in-progress={ms.status === 'In Progress'}
                class:status-complete={ms.status === 'Complete'}
                on:click={() => startEdit(ms.id, 'status', ms.status)}
                on:keydown={() => {}}
                role="button"
                tabindex="0"
              >
                {ms.status}
              </span>
            {/if}
          </td>

          <!-- Progress -->
          <td class="col-progress">
            <div class="progress-cell">
              <span class="progress-text">{progress.done}/{progress.total}</span>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  style="width: {progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%"
                ></div>
              </div>
            </div>
          </td>

          <!-- Actions -->
          <td class="col-actions">
            <button class="btn-delete" on:click={() => handleDelete(ms.id)}>Delete</button>
          </td>
        </tr>
      {/each}

      <!-- Add milestone row -->
      <tr class="add-row">
        <td class="col-id">
          <input
            type="text"
            class="add-input"
            placeholder="ID"
            bind:value={newMilestone.id}
            on:keydown={handleAddKeydown}
          />
        </td>
        <td class="col-name">
          <input
            type="text"
            class="add-input"
            placeholder="Milestone name"
            bind:value={newMilestone.name}
            on:keydown={handleAddKeydown}
          />
        </td>
        <td class="col-target">
          <input
            type="date"
            class="add-input"
            bind:value={newMilestone.target}
            on:keydown={handleAddKeydown}
          />
        </td>
        <td class="col-status">
          <select class="add-input" bind:value={newMilestone.status}>
            {#each statusOptions as opt}
              <option value={opt}>{opt}</option>
            {/each}
          </select>
        </td>
        <td class="col-progress"></td>
        <td class="col-actions">
          <button class="btn-add" on:click={handleAdd}>Add</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>

<style>
  .milestones-wrapper {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  thead {
    background: var(--bg-surface-subtle);
  }

  th {
    text-align: left;
    padding: 10px 12px;
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 2px solid var(--border-default);
  }

  td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-default);
    vertical-align: middle;
    color: var(--text-primary);
  }

  tr.alt {
    background: var(--bg-surface-subtle);
  }

  tbody tr:not(.add-row):hover {
    background: var(--bg-surface-hover);
  }

  /* Column widths */
  .col-id { width: 80px; }
  .col-name { min-width: 180px; }
  .col-target { width: 140px; }
  .col-status { width: 130px; }
  .col-progress { width: 140px; }
  .col-actions { width: 90px; text-align: center; }

  /* Editable cells */
  .editable {
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    transition: background 0.15s;
  }

  .editable:hover {
    background: var(--bg-surface-emphasis);
  }

  /* Status badges */
  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 500;
  }

  .status-not-started {
    background: var(--bg-surface-muted);
    color: var(--text-muted);
  }

  .status-in-progress {
    background: var(--accent-soft);
    color: var(--accent-soft-text);
  }

  .status-complete {
    background: var(--success-soft);
    color: var(--success-strong);
  }

  /* Inline inputs */
  .inline-input,
  .inline-select {
    width: 100%;
    padding: 4px 6px;
    font-size: 0.9rem;
    font-family: inherit;
    border: 1px solid var(--accent);
    border-radius: 3px;
    outline: none;
    background: var(--input-bg);
    color: var(--text-primary);
    box-shadow: 0 0 0 2px var(--focus-ring);
  }

  .inline-input:focus,
  .inline-select:focus {
    border-color: var(--accent-hover);
    box-shadow: 0 0 0 2px var(--focus-ring);
  }

  /* Progress bar */
  .progress-cell {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .progress-text {
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .progress-bar {
    width: 100%;
    height: 5px;
    background: var(--bg-surface-emphasis);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--success);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  /* Delete button */
  .btn-delete {
    padding: 4px 10px;
    font-size: 0.8rem;
    font-family: inherit;
    border: 1px solid transparent;
    border-radius: 4px;
    background: none;
    color: var(--text-faint);
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-delete:hover {
    color: var(--danger-strong);
    background: var(--danger-soft);
    border-color: var(--danger-border);
  }

  /* Add row */
  .add-row {
    background: var(--bg-surface-warning) !important;
  }

  .add-row:hover {
    background: var(--bg-surface-warning-hover) !important;
  }

  .add-input {
    width: 100%;
    padding: 4px 6px;
    font-size: 0.85rem;
    font-family: inherit;
    border: 1px solid var(--input-border);
    border-radius: 3px;
    background: var(--input-bg);
    outline: none;
    color: var(--text-primary);
  }

  .add-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--focus-ring);
  }

  .add-input::placeholder {
    color: var(--text-faint);
  }

  .btn-add {
    padding: 5px 14px;
    font-size: 0.85rem;
    font-family: inherit;
    border: none;
    border-radius: 4px;
    background: var(--accent);
    color: var(--accent-contrast);
    cursor: pointer;
    font-weight: 500;
    transition: background 0.15s;
  }

  .btn-add:hover {
    background: var(--accent-hover);
  }

  .btn-add:active {
    background: var(--accent-hover);
  }
</style>
