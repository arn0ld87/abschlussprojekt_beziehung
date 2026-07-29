export function parseCsv(csvText: string): Record<string, string>[] {
  let text = csvText;
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  const firstLineIdx = text.indexOf('\n');
  const firstLine = firstLineIdx !== -1 ? text.slice(0, firstLineIdx) : text;
  const counts = countDelimitersOutsideQuotes(firstLine);
  const delimiter = counts.semi > counts.comma ? ';' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentVal);
        currentVal = '';
      } else if (char === '\r') {

      } else if (char === '\n') {
        currentRow.push(currentVal);
        rows.push(currentRow);
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }

  if (currentVal !== '' || currentRow.length > 0) {
    currentRow.push(currentVal);
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());
  const results: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 1 && row[0].trim() === '') continue;

    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        const cell = row[j] ?? '';
        obj[headers[j]] = cell === '' ? '' : cell.trim();
      }
    }
    results.push(obj);
  }

  return results;
}

// Delimiter-Detection muss Felder in Anführungszeichen ignorieren, sonst
// kippt die Spaltenerkennung bei Headern mit eingebettetem ';' oder ','.
// Doppelte Quotes innerhalb eines quoted-Felds werden als Escape gezählt.
function countDelimitersOutsideQuotes(line: string): { comma: number; semi: number } {
  let comma = 0;
  let semi = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (c === ',') comma++;
    else if (c === ';') semi++;
  }
  return { comma, semi };
}
