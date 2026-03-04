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
    background: #f8f9fa;
  }

  th {
    text-align: left;
    padding: 10px 12px;
    font-weight: 600;
    color: #4a5568;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 2px solid #e2e8f0;
  }

  td {
    padding: 8px 12px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: middle;
  }

  tr.alt {
    background: #f8fafc;
  }

  tbody tr:not(.add-row):hover {
    background: #edf2f7;
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
    background: #e2e8f0;
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
    background: #f1f5f9;
    color: #64748b;
  }

  .status-in-progress {
    background: #eff6ff;
    color: #2563eb;
  }

  .status-complete {
    background: #f0fdf4;
    color: #16a34a;
  }

  /* Inline inputs */
  .inline-input,
  .inline-select {
    width: 100%;
    padding: 4px 6px;
    font-size: 0.9rem;
    font-family: inherit;
    border: 1px solid #93c5fd;
    border-radius: 3px;
    outline: none;
    background: #fff;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
  }

  .inline-input:focus,
  .inline-select:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
  }

  /* Progress bar */
  .progress-cell {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .progress-text {
    font-size: 0.82rem;
    color: #64748b;
  }

  .progress-bar {
    width: 100%;
    height: 5px;
    background: #e2e8f0;
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #22c55e;
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
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-delete:hover {
    color: #dc2626;
    background: #fef2f2;
    border-color: #fecaca;
  }

  /* Add row */
  .add-row {
    background: #fefce8 !important;
  }

  .add-row:hover {
    background: #fef9c3 !important;
  }

  .add-input {
    width: 100%;
    padding: 4px 6px;
    font-size: 0.85rem;
    font-family: inherit;
    border: 1px solid #d1d5db;
    border-radius: 3px;
    background: #fff;
    outline: none;
  }

  .add-input:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
  }

  .add-input::placeholder {
    color: #9ca3af;
  }

  .btn-add {
    padding: 5px 14px;
    font-size: 0.85rem;
    font-family: inherit;
    border: none;
    border-radius: 4px;
    background: #2563eb;
    color: #fff;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.15s;
  }

  .btn-add:hover {
    background: #1d4ed8;
  }

  .btn-add:active {
    background: #1e40af;
  }
</style>
