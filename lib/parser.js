/**
 * Parser for project.md format.
 * Converts markdown text into a structured JSON data model.
 */

/**
 * Parse a project.md markdown string into a structured object.
 * @param {string} markdown - the raw markdown content
 * @returns {object} parsed data model
 */
function parse(markdown) {
  const lines = markdown.split('\n');
  const data = {};

  // Extract title from first # line
  for (const line of lines) {
    const titleMatch = line.match(/^# Project: (.+)$/);
    if (titleMatch) {
      data.title = titleMatch[1];
      break;
    }
  }

  // Split into sections by ## headings
  const sections = {};
  let currentSection = null;
  let currentLines = [];

  for (const line of lines) {
    const sectionMatch = line.match(/^## (.+)$/);
    if (sectionMatch) {
      if (currentSection) {
        sections[currentSection] = currentLines;
      }
      currentSection = sectionMatch[1];
      currentLines = [];
    } else if (currentSection) {
      currentLines.push(line);
    }
  }
  if (currentSection) {
    sections[currentSection] = currentLines;
  }

  // Parse Milestones
  if (sections['Milestones']) {
    const result = parseMilestones(sections['Milestones']);
    data.milestones = result.milestones;
    data.milestoneColumnWidths = result.columnWidths;
  }

  // Parse Kanban
  if (sections['Kanban']) {
    data.kanban = parseKanban(sections['Kanban']);
  }

  // Parse Todos
  if (sections['Todos']) {
    data.todos = parseTodos(sections['Todos']);
  }

  // Calendar is skipped on parse (derived data)

  return data;
}

/**
 * Parse the Milestones section lines into milestone objects.
 * Also extracts column widths for round-trip fidelity.
 */
function parseMilestones(lines) {
  const tableLines = lines.filter(l => l.startsWith('|'));
  if (tableLines.length < 3) {
    return { milestones: [], columnWidths: [] };
  }

  // Extract column widths from the separator row (second table line)
  const separatorLine = tableLines[1];
  const sepCells = separatorLine.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
  const columnWidths = sepCells.map(c => c.length);

  // Parse data rows (skip header and separator)
  const milestones = [];
  for (let i = 2; i < tableLines.length; i++) {
    const cells = tableLines[i].split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    const trimmed = cells.map(c => c.trim());
    milestones.push({
      id: trimmed[0],
      name: trimmed[1],
      target: trimmed[2],
      status: trimmed[3],
    });
  }

  return { milestones, columnWidths };
}

/**
 * Parse the Kanban section lines into column/task structure.
 */
function parseKanban(lines) {
  const columns = [];
  let currentColumn = null;

  for (const line of lines) {
    const columnMatch = line.match(/^### (.+)$/);
    if (columnMatch) {
      currentColumn = { name: columnMatch[1], tasks: [] };
      columns.push(currentColumn);
      continue;
    }

    if (currentColumn) {
      const taskMatch = line.match(/^- \[([ x])\] `([^`]+)` (.+?) `([^`]+)`$/);
      if (taskMatch) {
        currentColumn.tasks.push({
          id: taskMatch[2],
          title: taskMatch[3],
          milestone: taskMatch[4],
          done: taskMatch[1] === 'x',
        });
      }
    }
  }

  return { columns };
}

/**
 * Parse the Todos section lines into description + items.
 */
function parseTodos(lines) {
  const descriptionLines = [];
  const items = [];
  let foundFirstItem = false;

  for (const line of lines) {
    const itemMatch = line.match(/^- \[([ x])\] (.+)$/);
    if (itemMatch) {
      foundFirstItem = true;
      items.push({
        text: itemMatch[2],
        done: itemMatch[1] === 'x',
      });
    } else if (!foundFirstItem) {
      descriptionLines.push(line);
    }
  }

  // Trim leading/trailing empty lines from description, then join
  // Remove leading empty lines
  while (descriptionLines.length > 0 && descriptionLines[0].trim() === '') {
    descriptionLines.shift();
  }
  // Remove trailing empty lines
  while (descriptionLines.length > 0 && descriptionLines[descriptionLines.length - 1].trim() === '') {
    descriptionLines.pop();
  }

  const description = descriptionLines.join('\n');

  return { description, items };
}

export default parse;
