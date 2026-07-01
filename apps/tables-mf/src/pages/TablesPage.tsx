import { useTables } from '../hooks/useTables';
import { TablesGrid } from '../components/TablesGrid';

export function TablesPage() {
  const { tables, isLoading, error, refresh, branch } = useTables();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-maison-accent">
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <p>Error al cargar las mesas: {error.message}</p>
        <button onClick={refresh} className="mt-2 underline">Intentar de nuevo</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-maison-cream">Gestión de Mesas</h1>
          <p className="text-sm text-maison-cream-muted">Sucursal: {branch.name}</p>
        </div>
        <button 
          onClick={refresh}
          className="px-4 py-2 bg-surface-2 rounded-lg text-sm text-maison-cream hover:bg-surface-3 transition"
        >
          Actualizar Vista
        </button>
      </header>

      {/* Aquí renderizamos el croquis o grid */}
      <TablesGrid data={tables?.data || []} />
    </div>
  );
}