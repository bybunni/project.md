<script>
  import { onMount, onDestroy } from 'svelte';
  import { fetchProject, listenForChanges } from './lib/api.js';
  import Milestones from './components/Milestones.svelte';
  import Kanban from './components/Kanban.svelte';
  import Calendar from './components/Calendar.svelte';
  import Todos from './components/Todos.svelte';
  import RawEditor from './components/RawEditor.svelte';

  let data = null;
  let error = null;
  let activeTab = 'kanban';
  let eventSource;

  const tabs = [
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

  onMount(() => {
    loadData();
    eventSource = listenForChanges(() => loadData());
  });

  onDestroy(() => {
    if (eventSource) eventSource.close();
  });
</script>

<main>
  <header>
    <h1>{data ? data.title : 'Loading...'}</h1>
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
    <div class="content">
      {#if activeTab === 'milestones'}
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
  header {
    margin-bottom: 24px;
  }
  h1 {
    font-size: 1.5rem;
    margin-bottom: 16px;
    color: #1a1a1a;
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
