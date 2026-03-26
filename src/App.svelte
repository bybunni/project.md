<script>
  import { onMount, onDestroy } from 'svelte';
  import { fetchProject, fetchStatus, openProject, createProject, listenForChanges } from './lib/api.js';
  import { applyTheme, readStoredTheme, resolveInitialTheme, saveThemePreference, watchSystemTheme } from './lib/theme.js';
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
  let theme = 'light';
  let stopSystemThemeSync = () => {};

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

  $: themeToggleText = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  $: themeToggleLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

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

  function setTheme(nextTheme) {
    theme = nextTheme;
    applyTheme(nextTheme);
  }

  function initializeTheme() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const storedTheme = readStoredTheme(window.localStorage);

    setTheme(resolveInitialTheme({
      storedTheme,
      prefersDark: mediaQuery.matches,
    }));

    if (!storedTheme) {
      stopSystemThemeSync = watchSystemTheme(mediaQuery, setTheme);
    }
  }

  function handleThemeToggle() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    stopSystemThemeSync();
    stopSystemThemeSync = () => {};
    saveThemePreference(nextTheme, window.localStorage);
    setTheme(nextTheme);
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
    initializeTheme();

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
    stopSystemThemeSync();
  });
</script>

<main>
  {#if !projectLoaded}
    <div class="landing">
      <div class="landing-card">
        <button
          class="theme-toggle landing-theme-toggle"
          type="button"
          on:click={handleThemeToggle}
          aria-label={themeToggleLabel}
          title={themeToggleLabel}
        >
          {themeToggleText}
        </button>
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
          <button
            class="theme-toggle"
            type="button"
            on:click={handleThemeToggle}
            aria-label={themeToggleLabel}
            title={themeToggleLabel}
          >
            {themeToggleText}
          </button>
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
  :global(:root) {
    color-scheme: light;
    --bg-page: #f3f6fb;
    --bg-surface: #ffffff;
    --bg-surface-subtle: #f8fafc;
    --bg-surface-muted: #f1f5f9;
    --bg-surface-hover: #edf2f7;
    --bg-surface-emphasis: #e2e8f0;
    --bg-surface-inset: #fafafa;
    --bg-surface-info: #eff6ff;
    --bg-surface-warning: #fefce8;
    --bg-surface-warning-hover: #fef9c3;
    --border-default: #e2e8f0;
    --border-strong: #cbd5e1;
    --border-accent: #bfdbfe;
    --text-primary: #1e293b;
    --text-secondary: #475569;
    --text-muted: #64748b;
    --text-faint: #94a3b8;
    --accent: #3b82f6;
    --accent-hover: #2563eb;
    --accent-contrast: #ffffff;
    --accent-soft: #dbeafe;
    --accent-soft-hover: #bfdbfe;
    --accent-soft-text: #2563eb;
    --success: #22c55e;
    --success-strong: #16a34a;
    --success-soft: #f0fdf4;
    --danger: #ef4444;
    --danger-strong: #dc2626;
    --danger-soft: #fee2e2;
    --danger-border: #fecaca;
    --input-bg: #ffffff;
    --input-bg-subtle: #f8fafc;
    --input-border: #d1d5db;
    --focus-ring: rgba(59, 130, 246, 0.2);
    --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.08);
    --shadow-md: 0 2px 8px rgba(15, 23, 42, 0.12);
    --shadow-lg: 0 8px 24px rgba(15, 23, 42, 0.18);
    --milestone-bg: #dbeafe;
    --milestone-bg-hover: #bfdbfe;
    --milestone-text: #2563eb;
    --assignee-bg: #ede9fe;
    --assignee-bg-hover: #ddd6fe;
    --assignee-text: #7c3aed;
    --id-badge-bg: #e2e8f0;
    --id-badge-text: #475569;
    --kbd-bg: #f3f4f6;
    --calendar-chip-1-bg: #eff6ff;
    --calendar-chip-1-text: #2563eb;
    --calendar-chip-1-border: #bfdbfe;
    --calendar-chip-2-bg: #f0fdf4;
    --calendar-chip-2-text: #16a34a;
    --calendar-chip-2-border: #bbf7d0;
    --calendar-chip-3-bg: #fef3c7;
    --calendar-chip-3-text: #d97706;
    --calendar-chip-3-border: #fde68a;
    --calendar-chip-4-bg: #fdf2f8;
    --calendar-chip-4-text: #db2777;
    --calendar-chip-4-border: #fbcfe8;
    --calendar-chip-5-bg: #f5f3ff;
    --calendar-chip-5-text: #7c3aed;
    --calendar-chip-5-border: #ddd6fe;
    --calendar-chip-6-bg: #ecfeff;
    --calendar-chip-6-text: #0891b2;
    --calendar-chip-6-border: #a5f3fc;
    --calendar-chip-7-bg: #fff7ed;
    --calendar-chip-7-text: #ea580c;
    --calendar-chip-7-border: #fed7aa;
    --calendar-chip-8-bg: #fef2f2;
    --calendar-chip-8-text: #dc2626;
    --calendar-chip-8-border: #fecaca;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme])) {
      color-scheme: dark;
      --bg-page: #08111f;
      --bg-surface: #101826;
      --bg-surface-subtle: #152032;
      --bg-surface-muted: #1a2638;
      --bg-surface-hover: #22314a;
      --bg-surface-emphasis: #2b3d56;
      --bg-surface-inset: #0d1522;
      --bg-surface-info: #102a45;
      --bg-surface-warning: #3b3117;
      --bg-surface-warning-hover: #4d3f1b;
      --border-default: #2a3b56;
      --border-strong: #3e5576;
      --border-accent: #2563eb;
      --text-primary: #e5eefc;
      --text-secondary: #c6d3e7;
      --text-muted: #9cafc9;
      --text-faint: #8395b3;
      --accent: #60a5fa;
      --accent-hover: #93c5fd;
      --accent-contrast: #08111f;
      --accent-soft: #17345c;
      --accent-soft-hover: #21457a;
      --accent-soft-text: #bfdbfe;
      --success: #4ade80;
      --success-strong: #4ade80;
      --success-soft: #163824;
      --danger: #f87171;
      --danger-strong: #f87171;
      --danger-soft: #3d1d25;
      --danger-border: #7f1d1d;
      --input-bg: #0d1522;
      --input-bg-subtle: #111c2b;
      --input-border: #31435f;
      --focus-ring: rgba(96, 165, 250, 0.25);
      --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.35);
      --shadow-md: 0 6px 16px rgba(0, 0, 0, 0.35);
      --shadow-lg: 0 14px 32px rgba(0, 0, 0, 0.45);
      --milestone-bg: #17345c;
      --milestone-bg-hover: #21457a;
      --milestone-text: #bfdbfe;
      --assignee-bg: #31204d;
      --assignee-bg-hover: #422a68;
      --assignee-text: #d8b4fe;
      --id-badge-bg: #2b3d56;
      --id-badge-text: #c6d3e7;
      --kbd-bg: #1c2638;
      --calendar-chip-1-bg: #17345c;
      --calendar-chip-1-text: #bfdbfe;
      --calendar-chip-1-border: #2563eb;
      --calendar-chip-2-bg: #163824;
      --calendar-chip-2-text: #86efac;
      --calendar-chip-2-border: #15803d;
      --calendar-chip-3-bg: #4a2d16;
      --calendar-chip-3-text: #fdba74;
      --calendar-chip-3-border: #c2410c;
      --calendar-chip-4-bg: #4b1f38;
      --calendar-chip-4-text: #f9a8d4;
      --calendar-chip-4-border: #db2777;
      --calendar-chip-5-bg: #31204d;
      --calendar-chip-5-text: #d8b4fe;
      --calendar-chip-5-border: #8b5cf6;
      --calendar-chip-6-bg: #173643;
      --calendar-chip-6-text: #a5f3fc;
      --calendar-chip-6-border: #0891b2;
      --calendar-chip-7-bg: #4a2d16;
      --calendar-chip-7-text: #fdba74;
      --calendar-chip-7-border: #ea580c;
      --calendar-chip-8-bg: #3d1d25;
      --calendar-chip-8-text: #fca5a5;
      --calendar-chip-8-border: #dc2626;
    }
  }

  :global(:root[data-theme='dark']) {
    color-scheme: dark;
    --bg-page: #08111f;
    --bg-surface: #101826;
    --bg-surface-subtle: #152032;
    --bg-surface-muted: #1a2638;
    --bg-surface-hover: #22314a;
    --bg-surface-emphasis: #2b3d56;
    --bg-surface-inset: #0d1522;
    --bg-surface-info: #102a45;
    --bg-surface-warning: #3b3117;
    --bg-surface-warning-hover: #4d3f1b;
    --border-default: #2a3b56;
    --border-strong: #3e5576;
    --border-accent: #2563eb;
    --text-primary: #e5eefc;
    --text-secondary: #c6d3e7;
    --text-muted: #9cafc9;
    --text-faint: #8395b3;
    --accent: #60a5fa;
    --accent-hover: #93c5fd;
    --accent-contrast: #08111f;
    --accent-soft: #17345c;
    --accent-soft-hover: #21457a;
    --accent-soft-text: #bfdbfe;
    --success: #4ade80;
    --success-strong: #4ade80;
    --success-soft: #163824;
    --danger: #f87171;
    --danger-strong: #f87171;
    --danger-soft: #3d1d25;
    --danger-border: #7f1d1d;
    --input-bg: #0d1522;
    --input-bg-subtle: #111c2b;
    --input-border: #31435f;
    --focus-ring: rgba(96, 165, 250, 0.25);
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.35);
    --shadow-md: 0 6px 16px rgba(0, 0, 0, 0.35);
    --shadow-lg: 0 14px 32px rgba(0, 0, 0, 0.45);
    --milestone-bg: #17345c;
    --milestone-bg-hover: #21457a;
    --milestone-text: #bfdbfe;
    --assignee-bg: #31204d;
    --assignee-bg-hover: #422a68;
    --assignee-text: #d8b4fe;
    --id-badge-bg: #2b3d56;
    --id-badge-text: #c6d3e7;
    --kbd-bg: #1c2638;
    --calendar-chip-1-bg: #17345c;
    --calendar-chip-1-text: #bfdbfe;
    --calendar-chip-1-border: #2563eb;
    --calendar-chip-2-bg: #163824;
    --calendar-chip-2-text: #86efac;
    --calendar-chip-2-border: #15803d;
    --calendar-chip-3-bg: #4a2d16;
    --calendar-chip-3-text: #fdba74;
    --calendar-chip-3-border: #c2410c;
    --calendar-chip-4-bg: #4b1f38;
    --calendar-chip-4-text: #f9a8d4;
    --calendar-chip-4-border: #db2777;
    --calendar-chip-5-bg: #31204d;
    --calendar-chip-5-text: #d8b4fe;
    --calendar-chip-5-border: #8b5cf6;
    --calendar-chip-6-bg: #173643;
    --calendar-chip-6-text: #a5f3fc;
    --calendar-chip-6-border: #0891b2;
    --calendar-chip-7-bg: #4a2d16;
    --calendar-chip-7-text: #fdba74;
    --calendar-chip-7-border: #ea580c;
    --calendar-chip-8-bg: #3d1d25;
    --calendar-chip-8-text: #fca5a5;
    --calendar-chip-8-border: #dc2626;
  }

  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg-page);
    color: var(--text-primary);
    transition: background 0.2s ease, color 0.2s ease;
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
    background: var(--bg-surface);
    border-radius: 12px;
    padding: 48px 64px;
    box-shadow: var(--shadow-md);
    position: relative;
  }
  .landing-card h1 {
    font-size: 2rem;
    margin-bottom: 8px;
    color: var(--text-primary);
  }
  .landing-card p {
    color: var(--text-muted);
    margin-bottom: 24px;
  }
  .theme-toggle {
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid var(--border-default);
    background: var(--bg-surface-subtle);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    font-family: inherit;
  }
  .theme-toggle:hover {
    background: var(--bg-surface-hover);
    color: var(--text-primary);
    border-color: var(--border-strong);
  }
  .landing-theme-toggle {
    position: absolute;
    top: 18px;
    right: 18px;
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
    background: var(--accent);
    color: var(--accent-contrast);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.15s;
  }
  .open-btn:hover:not(:disabled) {
    background: var(--accent-hover);
  }
  .open-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .open-btn.secondary {
    background: var(--bg-surface);
    color: var(--accent-soft-text);
    border: 1px solid var(--border-accent);
  }
  .open-btn.secondary:hover:not(:disabled) {
    background: var(--bg-surface-info);
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
    color: var(--text-primary);
  }
  .header-actions {
    display: flex;
    gap: 8px;
  }
  .filename {
    font-size: 0.8rem;
    color: var(--text-faint);
  }
  .load-btn {
    padding: 6px 14px;
    font-size: 0.85rem;
    background: var(--bg-surface-muted);
    color: var(--text-secondary);
    border: 1px solid var(--border-default);
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .load-btn:hover:not(:disabled) {
    background: var(--bg-surface-hover);
  }
  .load-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .load-btn.secondary {
    background: var(--bg-surface);
    color: var(--accent-soft-text);
    border-color: var(--border-accent);
  }
  .load-btn.secondary:hover:not(:disabled) {
    background: var(--bg-surface-info);
  }
  nav {
    display: flex;
    gap: 4px;
    border-bottom: 2px solid var(--border-default);
    padding-bottom: 0;
  }
  nav button {
    padding: 8px 16px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--text-muted);
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: color 0.15s, border-color 0.15s;
  }
  nav button:hover {
    color: var(--text-secondary);
  }
  nav button.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    font-weight: 600;
  }
  .content {
    background: var(--bg-surface);
    border-radius: 8px;
    padding: 24px;
    box-shadow: var(--shadow-sm);
  }
  .content.dashboard {
    background: transparent;
    padding: 0;
    box-shadow: none;
  }
  .dashboard-section {
    background: var(--bg-surface);
    border-radius: 8px;
    padding: 24px;
    box-shadow: var(--shadow-sm);
    margin-bottom: 24px;
    transition: box-shadow 0.15s, border-color 0.15s;
    border: 2px solid transparent;
  }
  .dashboard-section.drag-over {
    border-color: var(--accent);
    box-shadow: 0 2px 8px var(--focus-ring);
  }
  .dashboard-section h2.drag-handle {
    font-size: 1.1rem;
    color: var(--text-secondary);
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-default);
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
    color: var(--text-faint);
    font-size: 1rem;
    line-height: 1;
  }
  .error {
    background: var(--danger-soft);
    color: var(--danger-strong);
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid var(--danger-border);
  }
  .loading {
    text-align: center;
    padding: 40px;
    color: var(--text-muted);
  }
</style>
