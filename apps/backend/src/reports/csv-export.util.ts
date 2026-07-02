export function arrayToCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(',');

  const dataLines = rows.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        const stringValue = String(value ?? '');
        // Si el valor contiene comas o comillas, lo envolvemos en comillas dobles
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(','),
  );

  return [headerLine, ...dataLines].join('\n');
}
