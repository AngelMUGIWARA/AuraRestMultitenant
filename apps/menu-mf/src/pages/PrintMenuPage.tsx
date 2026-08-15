import { useBranch } from '@maison/ui';
import { usePrintableMenu } from '../hooks/usePrintableMenu';
import { formatCurrency } from '../utils';
import './PrintMenuPage.css';

export default function PrintMenuPage() {
  const { selectedBranch } = useBranch();

  const { menu, loading, error } = usePrintableMenu(selectedBranch.id);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return <div>Cargando menú...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!menu) {
    return <div>No se encontró información del menú.</div>;
  }

  return (
    <div className="print-menu-container">

      {/* Solo visible en pantalla */}
      <div className="no-print flex justify-end mb-6">
        <button
            type="button"
            onClick={handlePrint}
            className="btn-primary"
        >
            🖨️ Imprimir menú
        </button>
        </div>


      {/* Encabezado del menú */}
      <header className="text-center mb-8">

        {menu.tenant.logoUrl && (
          <img
            src={menu.tenant.logoUrl}
            alt={menu.tenant.name}
            className="mx-auto mb-4 h-24 w-24 object-contain"
          />
        )}

        <h1 className="font-display text-4xl font-semibold">
          {menu.tenant.name}
        </h1>

        <h2 className="mt-2 text-xl">
          {menu.branch.name}
        </h2>

        {menu.branch.address && (
          <p>{menu.branch.address}</p>
        )}

        {menu.branch.phone && (
          <p>{menu.branch.phone}</p>
        )}

      </header>


      {/* Categorías */}
      <main className="space-y-10">

        {menu.categories.map((category) => (
          <section key={category.id}>

            <h3 className="text-2xl font-semibold border-b pb-2">
              {category.name}
            </h3>

            {category.description && (
              <p className="mt-2 text-sm opacity-70">
                {category.description}
              </p>
            )}


            <div className="mt-4 space-y-5">

              {category.items.map((item) => (
                <article
                  key={item.id}
                  className="flex gap-4"
                >

                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-20 w-20 rounded object-cover"
                    />
                  )}

                  <div className="flex-1">

                    <div className="flex justify-between">
                      <h4 className="font-medium">
                        {item.name}
                      </h4>

                      <span className="font-semibold">
                        {formatCurrency(item.price)}
                      </span>
                    </div>


                    {item.description && (
                      <p className="text-sm opacity-70">
                        {item.description}
                      </p>
                    )}

                  </div>

                </article>
              ))}

            </div>

          </section>
        ))}

      </main>


      <footer className="mt-10 text-center text-sm opacity-60">
        Última actualización:
        {' '}
        {new Date(menu.updatedAt).toLocaleDateString('es-ES')}
      </footer>

    </div>
  );
}