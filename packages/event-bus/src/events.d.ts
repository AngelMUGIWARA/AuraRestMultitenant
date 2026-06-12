/**
 * Mapa de eventos del bus. Agrega aquí cualquier nuevo evento cross-MFE.
 * - Los eventos sin payload usan `undefined` como tipo.
 * - Los nombres siguen el patrón `dominio:accion`.
 */
export interface MaisonEventMap {
    /** El usuario cambió la sucursal activa en el Shell. */
    'branch:changed': {
        branchId: string;
        branchName: string;
        isGlobal: boolean;
    };
    /** El usuario inició sesión. */
    'auth:login': {
        userId: string;
    };
    /** El usuario cerró sesión o la sesión expiró. */
    'auth:logout': undefined;
    /** La sesión expiró por inactividad. */
    'auth:session-expired': undefined;
    /** Un MFE remoto terminó de montar su árbol React. */
    'mfe:ready': {
        name: string;
    };
}
export type MaisonEventName = keyof MaisonEventMap;
