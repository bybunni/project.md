/**
 * Serializer for project.md format.
 * Converts a structured JSON data model back to markdown text.
 */

import { padCell, formatTable, getDaysInMonth, getFirstDayOfWeek } from './utils.js';

/**
 * Serialize a parsed data model back to markdown string.
 * @param {object} data - the parsed data model from parser.js
 * @returns {string} markdown text
 */
function serialize(data) {
  const parts = [];

  // Title line, followed by the ## sections separated by ---
  parts.push(`# Project: ${data.title}`);

  // The ## sections are separated by \n\n---\n\n
  const sections = [];
  sections.push(serializeMilestones(data));
  sections.push(serializeKanban(data));
  sections.push(serializeCalendar(data));
  sections.push(serializeTodos(data));

  // Title is joined to first section by just \n\n, sections separated by \n\n---\n\n
  return parts[0] + '\n\n' + sections.join('\n\n---\n\n') + '\n';
}

/**
 * Serialize the Milestones section.
 */
function serializeMilestones(data) {
  const headers = ['ID', 'Milestone', 'Target', 'Status'];
  const widths = data.milestoneColumnWidths;
  const rows = data.milestones.map(m => [m.id, m.name, m.target, m.status]);

  const lines = [];
  lines.push('## Milestones');
  lines.push('');
  lines.push(formatTable(headers, widths, rows));

  return lines.join('\n');
}

/**
 * Serialize the Kanban section.
 */
function serializeKanban(data) {
  const lines = [];
  lines.push('## Kanban');

  for (const column of data.kanban.columns) {
    lines.push('');
    lines.push(`### ${column.name}`);
    lines.push('');
    for (const task of column.tasks) {
      const check = task.done ? 'x' : ' ';
      const assigneeSuffix = task.assignee ? ` @${task.assignee}` : '';
      lines.push(`- [${check}] \`${task.id}\` ${task.title} \`${task.milestone}\`${assigneeSuffix}`);
    }
  }

  return lines.join('\n');
}

/**
 * Serialize the Calendar section, derived from milestone target dates.
 */
function serializeCalendar(data) {
  const lines = [];
  lines.push('## Calendar');

  // Collect milestones by year-month
  const monthMap = new Map(); // key: "YYYY-MM", value: [{day, id}]
  for (const m of data.milestones) {
    const [year, month, day] = m.target.split('-').map(Number);
    const key = `${year}-${String(month).padStart(2, '0')}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, []);
    }
    monthMap.get(key).push({ day, id: m.id });
  }

  // Sort months chronologically
  const sortedMonths = [...monthMap.keys()].sort();

  for (const monthKey of sortedMonths) {
    const [year, month] = monthKey.split('-').map(Number);
    const milestones = monthMap.get(monthKey);

    // Build a map of day -> milestone id for quick lookup
    const dayMilestoneMap = new Map();
    for (const ms of milestones) {
      dayMilestoneMap.set(ms.day, ms.id);
    }

    lines.push('');
    lines.push(`### ${monthKey}`);
    lines.push('');

    const daysInMonth = getDaysInMonth(year, month);
    const firstDow = getFirstDayOfWeek(year, month); // 0=Mon, 6=Sun

    // Calendar cell width: normally 5 chars between pipes (e.g., " 1   " or " Mon ")
    const normalWidth = 5;
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Build grid: array of weeks, each week is array of 7 cells
    // Each cell is { text, isMilestone }
    const weeks = [];
    let currentWeek = new Array(7).fill(null).map(() => ({ text: '', isMilestone: false }));

    // Fill leading empty cells
    let dayOfWeek = firstDow;
    let dayNum = 1;

    // If first day doesn't start on Monday, fill empty cells
    for (let i = 0; i < firstDow; i++) {
      currentWeek[i] = { text: '', isMilestone: false };
    }

    while (dayNum <= daysInMonth) {
      const msId = dayMilestoneMap.get(dayNum);
      if (msId) {
        currentWeek[dayOfWeek] = { text: `**${dayNum} ${msId}**`, isMilestone: true };
      } else {
        currentWeek[dayOfWeek] = { text: String(dayNum), isMilestone: false };
      }

      dayOfWeek++;
      if (dayOfWeek === 7) {
        weeks.push(currentWeek);
        currentWeek = new Array(7).fill(null).map(() => ({ text: '', isMilestone: false }));
        dayOfWeek = 0;
      }
      dayNum++;
    }

    // Push last partial week if it has any days
    if (dayOfWeek > 0) {
      weeks.push(currentWeek);
    }

    // Now render the table
    // Header
    const headerCells = dayNames.map(d => ' ' + padCell(d, normalWidth - 2) + ' ');
    lines.push('|' + headerCells.join('|') + '|');

    // Separator
    const sepCells = dayNames.map(() => '-'.repeat(normalWidth));
    lines.push('|' + sepCells.join('|') + '|');

    // Data rows
    for (const week of weeks) {
      const cells = week.map(cell => {
        if (cell.isMilestone) {
          // Milestone cells expand: " **day MID** "
          return ' ' + cell.text + ' ';
        } else {
          // Normal cell: pad to normalWidth
          return ' ' + padCell(cell.text, normalWidth - 2) + ' ';
        }
      });
      lines.push('|' + cells.join('|') + '|');
    }
  }

  return lines.join('\n');
}

/**
 * Serialize the Todos section.
 */
function serializeTodos(data) {
  const lines = [];
  lines.push('## Todos');
  lines.push('');
  lines.push(data.todos.description);
  lines.push('');
  for (const item of data.todos.items) {
    const check = item.done ? 'x' : ' ';
    const assigneeSuffix = item.assignee ? ` @${item.assignee}` : '';
    lines.push(`- [${check}] ${item.text}${assigneeSuffix}`);
  }

  return lines.join('\n');
}

export default serialize;
