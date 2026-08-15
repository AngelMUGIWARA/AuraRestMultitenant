import type { ActivityEventType } from '@maison/types';

interface ActivityTranslation {
  title: string;
  description: (entityName?: string, branchName?: string) => string;
}

const ACTIVITY_TRANSLATIONS: Record<ActivityEventType, ActivityTranslation> = {
  tenant_created: {
    title: 'Organización creada',
    description: (name) => `${name || 'Nueva organización'} ha sido registrada en el sistema`,
  },
  user_registered: {
    title: 'Usuario registrado',
    description: (name) => `${name || 'Nuevo usuario'} se ha unido a la organización`,
  },
  plan_upgraded: {
    title: 'Plan actualizado',
    description: (name) => `Plan actualizado a ${name || 'plan superior'}`,
  },
  payment_received: {
    title: 'Pago recibido',
    description: (amount) => `Pago de ${amount || 'monto'} procesado exitosamente`,
  },
  tenant_suspended: {
    title: 'Organización suspendida',
    description: (name) => `${name || 'La organización'} ha sido suspendida`,
  },
  menu_published: {
    title: 'Menú publicado',
    description: (branchName) => `Menú publicado en ${branchName || 'sucursal'}`,
  },
};

export function translateActivityEvent(
  eventType: ActivityEventType,
  entityName?: string,
  branchName?: string
): { title: string; description: string } {
  const translation = ACTIVITY_TRANSLATIONS[eventType] || {
    title: 'Evento del sistema',
    description: () => 'Un evento ha ocurrido en el sistema',
  };

  return {
    title: translation.title,
    description: translation.description(entityName || branchName),
  };
}
