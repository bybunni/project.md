<script>
  import { createEventDispatcher } from 'svelte';

  export let milestones = [];

  const dispatch = createEventDispatcher();

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Today's date parts for highlighting
  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDay = now.getDate();

  // A small palette to assign consistent colors to milestone IDs
  const BADGE_COLORS = [
    { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
    { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
    { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8' },
    { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
    { bg: '#ecfeff', text: '#0891b2', border: '#a5f3fc' },
    { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
    { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  ];

  function getColorForId(id) {
    // Simple hash to get a consistent index
    let hash = 0;
    const s = String(id);
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
  }

  // Derive unique year-months from milestone target dates, sorted chronologically
  $: months = getUniqueMonths(milestones);

  function getUniqueMonths(ms) {
    const seen = new Set();
    const result = [];
    for (const m of ms) {
      if (!m.target) continue;
      const d = new Date(m.target + 'T00:00:00');
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ year: d.getFullYear(), month: d.getMonth() });
      }
    }
    result.sort((a, b) => a.year - b.year || a.month - b.month);
    return result;
  }

  // Build a lookup: "YYYY-M-D" -> array of milestone objects
  $: milestoneLookup = buildLookup(milestones);

  function buildLookup(ms) {
    const map = {};
    for (const m of ms) {
      if (!m.target) continue;
      const d = new Date(m.target + 'T00:00:00');
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    return map;
  }

  // Build the weeks grid for a given year/month
  function buildWeeks(year, month) {
    const firstDay = new Date(year, month, 1);
    // getDay() returns 0=Sun, we want 0=Mon ... 6=Sun
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks = [];
    let week = new Array(7).fill(null);

    let dayNum = 1;
    for (let i = startDow; i < 7 && dayNum <= daysInMonth; i++) {
      week[i] = dayNum++;
    }
    weeks.push(week);

    while (dayNum <= daysInMonth) {
      week = new Array(7).fill(null);
      for (let i = 0; i < 7 && dayNum <= daysInMonth; i++) {
        week[i] = dayNum++;
      }
      weeks.push(week);
    }

    return weeks;
  }

  function handleBadgeClick(milestoneId) {
    dispatch('navigate', { milestoneId });
  }
</script>

<div class="calendar-wrapper">
  {#if months.length === 0}
    <p class="empty-message">No milestone dates to display. Add target dates to milestones to see them on the calendar.</p>
  {/if}

  <div class="months-grid">
    {#each months as { year, month }}
      {@const weeks = buildWeeks(year, month)}
      <div class="month-card">
        <h3 class="month-heading">{MONTH_NAMES[month]} {year}</h3>
        <div class="calendar-grid">
          {#each DAY_LABELS as label, colIdx}
            <div class="day-header" class:weekend-header={colIdx >= 5}>{label}</div>
          {/each}

          {#each weeks as week}
            {#each week as day, colIdx}
              {@const isToday = day !== null && year === todayYear && month === todayMonth && day === todayDay}
              {@const key = `${year}-${month}-${day}`}
              {@const dayMilestones = day !== null ? (milestoneLookup[key] || []) : []}
              <div
                class="day-cell"
                class:empty-cell={day === null}
                class:weekend-cell={colIdx >= 5}
                class:today-cell={isToday}
              >
                {#if day !== null}
                  <span class="day-number" class:today-number={isToday}>{day}</span>
                  {#each dayMilestones as ms}
                    {@const color = getColorForId(ms.id)}
                    <button
                      class="milestone-badge"
                      style="background: {color.bg}; color: {color.text}; border-color: {color.border};"
                      on:click={() => handleBadgeClick(ms.id)}
                      title="{ms.name} ({ms.status})"
                    >
                      {ms.id}
                    </button>
                  {/each}
                {/if}
              </div>
            {/each}
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .calendar-wrapper {
    width: 100%;
  }

  .empty-message {
    text-align: center;
    color: #64748b;
    padding: 40px 20px;
    font-size: 0.9rem;
  }

  .months-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 24px;
  }

  .month-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
  }

  .month-heading {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 12px;
    text-align: center;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
  }

  .day-header {
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 6px 2px;
    border-bottom: 1px solid #e2e8f0;
  }

  .day-header.weekend-header {
    color: #94a3b8;
  }

  .day-cell {
    min-height: 48px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    border-bottom: 1px solid #f1f5f9;
  }

  .day-cell.empty-cell {
    background: transparent;
  }

  .day-cell.weekend-cell {
    background: #f8fafc;
  }

  .day-cell.today-cell {
    background: #eff6ff;
    border-radius: 4px;
  }

  .day-number {
    font-size: 0.8rem;
    color: #475569;
    line-height: 1;
    margin-bottom: 2px;
  }

  .day-number.today-number {
    font-weight: 700;
    color: #2563eb;
  }

  .milestone-badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 9px;
    font-size: 0.7rem;
    font-weight: 600;
    font-family: inherit;
    border: 1px solid;
    cursor: pointer;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.4;
    transition: opacity 0.15s, box-shadow 0.15s;
  }

  .milestone-badge:hover {
    opacity: 0.85;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }

  .milestone-badge:focus {
    outline: 2px solid #2563eb;
    outline-offset: 1px;
  }

  .milestone-badge:active {
    opacity: 0.7;
  }
</style>
