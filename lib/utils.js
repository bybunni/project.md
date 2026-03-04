/**
 * Shared utility helpers for project.md parser/serializer.
 */

/**
 * Right-pad text with spaces to the given width.
 * If text is already >= width, return it unchanged.
 * @param {string} text
 * @param {number} width
 * @returns {string}
 */
function padCell(text, width) {
  if (text.length >= width) return text;
  return text + ' '.repeat(width - text.length);
}

/**
 * Rebuild a markdown table from arrays, preserving column widths.
 * @param {string[]} headers - header cell texts (without padding)
 * @param {number[]} columnWidths - the full cell width for each column (content between | delimiters)
 * @param {string[][]} rows - array of row arrays, each containing cell texts (without padding)
 * @returns {string} the markdown table as a string (no trailing newline)
 */
function formatTable(headers, columnWidths, rows) {
  const lines = [];

  // Header row
  const headerCells = headers.map((h, i) => {
    const w = columnWidths[i];
    return ' ' + padCell(h, w - 2) + ' ';
  });
  lines.push('|' + headerCells.join('|') + '|');

  // Separator row
  const sepCells = columnWidths.map(w => '-'.repeat(w));
  lines.push('|' + sepCells.join('|') + '|');

  // Data rows
  for (const row of rows) {
    const cells = row.map((cell, i) => {
      const w = columnWidths[i];
      return ' ' + padCell(cell, w - 2) + ' ';
    });
    lines.push('|' + cells.join('|') + '|');
  }

  return lines.join('\n');
}

/**
 * Get the number of days in a given month.
 * @param {number} year
 * @param {number} month - 1-based (1=January, 12=December)
 * @returns {number}
 */
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Get the day of the week for the first day of a given month.
 * Returns 0=Monday, 6=Sunday (ISO week, starting Monday).
 * @param {number} year
 * @param {number} month - 1-based (1=January, 12=December)
 * @returns {number} 0-6 where 0=Monday, 6=Sunday
 */
function getFirstDayOfWeek(year, month) {
  const jsDay = new Date(year, month - 1, 1).getDay(); // 0=Sun, 6=Sat
  // Convert: Sun(0)->6, Mon(1)->0, Tue(2)->1, ..., Sat(6)->5
  return (jsDay + 6) % 7;
}

export { padCell, formatTable, getDaysInMonth, getFirstDayOfWeek };
