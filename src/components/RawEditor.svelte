<script>
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { fetchRaw, saveRaw } from '../lib/api.js';

  const dispatch = createEventDispatcher();

  let content = '';
  let status = '';
  let loading = true;

  onMount(async () => {
    try {
      const res = await fetchRaw();
      content = res.content;
    } catch (e) {
      status = 'error';
    }
    loading = false;
  });

  async function handleSave() {
    status = 'saving';
    try {
      await saveRaw(content);
      status = 'saved';
      dispatch('change');
      setTimeout(() => {
        if (status === 'saved') status = '';
      }, 2000);
    } catch (e) {
      status = 'error';
    }
  }

  function handleKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="editor-container">
  <div class="toolbar">
    <h3 class="toolbar-title">Raw Markdown Editor</h3>
    <div class="toolbar-actions">
      {#if status === 'saving'}
        <span class="status status-saving">Saving...</span>
      {:else if status === 'saved'}
        <span class="status status-saved">Saved</span>
      {:else if status === 'error'}
        <span class="status status-error">Error saving</span>
      {/if}
      <button
        class="save-btn"
        on:click={handleSave}
        disabled={loading || status === 'saving'}
      >
        Save
      </button>
    </div>
  </div>

  {#if loading}
    <div class="loading">Loading...</div>
  {:else}
    <textarea
      class="editor-textarea"
      bind:value={content}
      spellcheck="false"
    ></textarea>
  {/if}

  <div class="shortcut-hint">
    <kbd>Ctrl</kbd>+<kbd>S</kbd> to save
  </div>
</div>

<style>
  .editor-container {
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .toolbar-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .status {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .status-saving {
    color: #6b7280;
  }

  .status-saved {
    color: #10b981;
  }

  .status-error {
    color: #ef4444;
  }

  .save-btn {
    padding: 0.45rem 1.25rem;
    background-color: #3b82f6;
    color: #fff;
    border: none;
    border-radius: 5px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: background-color 0.15s ease;
  }

  .save-btn:hover:not(:disabled) {
    background-color: #2563eb;
  }

  .save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 500px;
    color: #9ca3af;
    font-size: 0.95rem;
  }

  .editor-textarea {
    width: 100%;
    min-height: 500px;
    padding: 1rem;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', 'Consolas', 'Monaco', monospace;
    font-size: 0.875rem;
    line-height: 1.6;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    resize: vertical;
    outline: none;
    color: #1f2937;
    background-color: #fafafa;
    tab-size: 2;
    transition: border-color 0.15s ease;
    box-sizing: border-box;
  }

  .editor-textarea:focus {
    border-color: #93c5fd;
    background-color: #fff;
  }

  .shortcut-hint {
    margin-top: 0.5rem;
    text-align: right;
    font-size: 0.78rem;
    color: #9ca3af;
  }

  kbd {
    display: inline-block;
    padding: 0.1rem 0.35rem;
    font-size: 0.72rem;
    font-family: inherit;
    color: #6b7280;
    background-color: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 3px;
  }
</style>
