import React from 'react';

/**
 * DashboardLayout (REM-Clearance)
 * Layout unificado para la cabina, dashboard y módulos de administración de RemixDock.
 * Aplica una holgura defensiva inferior permanente (pb-32 sm:pb-36) para garantizar que todo el contenido,
 * tarjetas de acciones y botones se desplacen holgadamente por encima del dock player persistente (mínimo 128px).
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col w-full pb-32 sm:pb-36">
      {children}
    </div>
  );
}
