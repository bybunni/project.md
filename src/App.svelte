<script>
  import { onMount, onDestroy } from 'svelte';
  import { fetchProject, fetchStatus, openProject, createProject, listenForChanges } from './lib/api.js';
  import Milestones from './components/Milestones.svelte';
  import Kanban from './components/Kanban.svelte';
  import Calendar from './components/Calendar.svelte';
  import Todos from './components/Todos.svelte';
  import RawEditor from './components/RawEditor.svelte';

  let data = null;
  let error = null;
  let activeTab = 'dashboard';
  let eventSource;
  let projectLoaded = false;
  let filename = null;
  let actionState = null;

  const defaultSectionOrder = ['todos', 'kanban', 'calendar', 'milestones'];
  let sectionOrder = JSON.parse(localStorage.getItem('dashboardOrder') || 'null') || [...defaultSectionOrder];

  let dragSrc = null;
  let dragOver = null;

  function onDragStart(e, id) {
    dragSrc = id;
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e, id) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOver = id;
  }

  function onDragLeave() {
    dragOver = null;
  }

  function onDrop(e, targetId) {
    e.preventDefault();
    if (dragSrc && dragSrc !== targetId) {
      const fromIdx = sectionOrder.indexOf(dragSrc);
      const toIdx = sectionOrder.indexOf(targetId);
      sectionOrder.splice(fromIdx, 1);
      sectionOrder.splice(toIdx, 0, dragSrc);
      sectionOrder = sectionOrder;
      localStorage.setItem('dashboardOrder', JSON.stringify(sectionOrder));
    }
    dragSrc = null;
    dragOver = null;
  }

  function onDragEnd() {
    dragSrc = null;
    dragOver = null;
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'milestones', label: 'Milestones' },
    { id: 'kanban', label: 'Kanban' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'todos', label: 'Todos' },
    { id: 'raw', label: 'Raw Editor' },
  ];

  async function loadData() {
    try {
      data = await fetchProject();
      error = null;
    } catch (e) {
      error = e.message;
    }
  }

  function connectSSE() {
    if (eventSource) eventSource.close();
    eventSource = listenForChanges(() => loadData());
  }

  function applyLoadedProject(result) {
    projectLoaded = true;
    filename = result.path ? result.path.split('/').pop() : null;
    data = result.data;
    error = null;
    connectSSE();
  }

  async function handleOpen() {
    actionState = 'opening';
    try {
      const result = await openProject();
      if (result.cancelled) return;
      if (result.error) { error = result.error; return; }
      applyLoadedProject(result);
    } catch (e) {
      error = e.message;
    } finally {
      actionState = null;
    }
  }

  async function handleCreate() {
    actionState = 'creating';
    try {
      const result = await createProject();
      if (result.cancelled) return;
      if (result.error) { error = result.error; return; }
      applyLoadedProject(result);
    } catch (e) {
      error = e.message;
    } finally {
      actionState = null;
    }
  }

  onMount(async () => {
    try {
      const status = await fetchStatus();
      if (status.loaded) {
        projectLoaded = true;
        filename = status.filename;
        await loadData();
        connectSSE();
      }
    } catch (e) {
      error = e.message;
    }
  });

  onDestroy(() => {
    if (eventSource) eventSource.close();
  });
</script>

<main>
  {#if !projectLoaded}
    <div class="landing">
      <div class="landing-card">
        <h1>project.md</h1>
        <p>Open a markdown project file or start a new one from a starter template.</p>
        <div class="landing-actions">
          <button class="open-btn secondary" on:click={handleCreate} disabled={actionState !== null}>
            {actionState === 'creating' ? 'Creating...' : 'New Project'}
          </button>
          <button class="open-btn" on:click={handleOpen} disabled={actionState !== null}>
            {actionState === 'opening' ? 'Opening...' : 'Open Project'}
          </button>
        </div>
      </div>
    </div>
  {:else}
    <header>
      <div class="header-row">
        <div>
          <h1>{data ? data.title : 'Loading...'}</h1>
          {#if filename}
            <span class="filename">{filename}</span>
          {/if}
        </div>
        <div class="header-actions">
          <button class="load-btn secondary" on:click={handleCreate} disabled={actionState !== null}>
            {actionState === 'creating' ? 'Creating...' : 'New Project'}
          </button>
          <button class="load-btn" on:click={handleOpen} disabled={actionState !== null}>
            {actionState === 'opening' ? 'Opening...' : 'Load File'}
          </button>
        </div>
      </div>
      <nav>
        {#each tabs as tab}
          <button
            class:active={activeTab === tab.id}
            on:click={() => activeTab = tab.id}
          >
            {tab.label}
          </button>
        {/each}
      </nav>
    </header>

    {#if error}
      <div class="error">Error: {error}</div>
    {:else if !data}
      <div class="loading">Loading...</div>
    {:else}
      <div class="content" class:dashboard={activeTab === 'dashboard'}>
        {#if activeTab === 'dashboard'}
          {#each sectionOrder as sectionId (sectionId)}
            <section
              class="dashboard-section"
              class:drag-over={dragOver === sectionId}
              draggable="true"
              aria-label={sectionId === 'calendar' ? 'Calendar dashboard section' : sectionId === 'kanban' ? 'Kanban dashboard section' : sectionId === 'milestones' ? 'Milestones dashboard section' : 'Todos dashboard section'}
              on:dragstart={(e) => onDragStart(e, sectionId)}
              on:dragover={(e) => onDragOver(e, sectionId)}
              on:dragleave={onDragLeave}
              on:drop={(e) => onDrop(e, sectionId)}
              on:dragend={onDragEnd}
            >
              <h2 class="drag-handle">
                <span class="grip">⠿</span>
                {sectionId === 'calendar' ? 'Calendar' : sectionId === 'kanban' ? 'Kanban' : sectionId === 'milestones' ? 'Milestones' : 'Todos'}
              </h2>
              {#if sectionId === 'calendar'}
                <Calendar milestones={data.milestones} on:navigate={() => { activeTab = 'milestones'; }} />
              {:else if sectionId === 'kanban'}
                <Kanban kanban={data.kanban} on:change={loadData} />
              {:else if sectionId === 'milestones'}
                <Milestones milestones={data.milestones} kanban={data.kanban} on:change={loadData} />
              {:else if sectionId === 'todos'}
                <Todos todos={data.todos} on:change={loadData} />
              {/if}
            </section>
          {/each}
        {:else if activeTab === 'milestones'}
          <Milestones milestones={data.milestones} kanban={data.kanban} on:change={loadData} />
        {:else if activeTab === 'kanban'}
          <Kanban kanban={data.kanban} on:change={loadData} />
        {:else if activeTab === 'calendar'}
          <Calendar milestones={data.milestones} on:navigate={(e) => { activeTab = 'milestones'; }} />
        {:else if activeTab === 'todos'}
          <Todos todos={data.todos} on:change={loadData} />
        {:else if activeTab === 'raw'}
          <RawEditor on:change={loadData} />
        {/if}
      </div>
    {/if}
  {/if}
</main>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f5f5f5;
    color: #1a1a1a;
  }
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }
  /* Landing screen */
  .landing {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
  }
  .landing-card {
    text-align: center;
    background: white;
    border-radius: 12px;
    padding: 48px 64px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .landing-card h1 {
    font-size: 2rem;
    margin-bottom: 8px;
    color: #1a1a1a;
  }
  .landing-card p {
    color: #666;
    margin-bottom: 24px;
  }
  .landing-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .open-btn {
    padding: 10px 24px;
    font-size: 1rem;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.15s;
  }
  .open-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }
  .open-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .open-btn.secondary {
    background: white;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }
  .open-btn.secondary:hover:not(:disabled) {
    background: #eff6ff;
  }
  /* Header */
  header {
    margin-bottom: 24px;
  }
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  h1 {
    font-size: 1.5rem;
    color: #1a1a1a;
  }
  .header-actions {
    display: flex;
    gap: 8px;
  }
  .filename {
    font-size: 0.8rem;
    color: #888;
  }
  .load-btn {
    padding: 6px 14px;
    font-size: 0.85rem;
    background: #f0f0f0;
    color: #333;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .load-btn:hover:not(:disabled) {
    background: #e0e0e0;
  }
  .load-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .load-btn.secondary {
    background: white;
    color: #2563eb;
    border-color: #bfdbfe;
  }
  .load-btn.secondary:hover:not(:disabled) {
    background: #eff6ff;
  }
  nav {
    display: flex;
    gap: 4px;
    border-bottom: 2px solid #e0e0e0;
    padding-bottom: 0;
  }
  nav button {
    padding: 8px 16px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: #666;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: color 0.15s, border-color 0.15s;
  }
  nav button:hover {
    color: #333;
  }
  nav button.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
    font-weight: 600;
  }
  .content {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .content.dashboard {
    background: transparent;
    padding: 0;
    box-shadow: none;
  }
  .dashboard-section {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 24px;
    transition: box-shadow 0.15s, border-color 0.15s;
    border: 2px solid transparent;
  }
  .dashboard-section.drag-over {
    border-color: #2563eb;
    box-shadow: 0 2px 8px rgba(37,99,235,0.15);
  }
  .dashboard-section h2.drag-handle {
    font-size: 1.1rem;
    color: #333;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e0e0e0;
    cursor: grab;
    display: flex;
    align-items: center;
    gap: 8px;
    user-select: none;
  }
  .dashboard-section h2.drag-handle:active {
    cursor: grabbing;
  }
  .grip {
    color: #bbb;
    font-size: 1rem;
    line-height: 1;
  }
  .error {
    background: #fef2f2;
    color: #dc2626;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid #fecaca;
  }
  .loading {
    text-align: center;
    padding: 40px;
    color: #666;
  }
</style>
