export function arrayToCsv(
  rows: Record<string, string | number>[],
  fallbackHeaders?: string[],
): string {
  if (rows.length === 0) {
    // Sin datos en el rango seleccionado: igual devolvemos la fila de
    // encabezados (si se conoce) en vez de un archivo vacío de 0 bytes,
    // que en el navegador se percibe como "no se generó nada".
    return fallbackHeaders ? fallbackHeaders.join(',') : '';
  }

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
