// src/interfaces/verification-types.ts

export interface EtiquetaData {
  id: number;
  area: string;
  claveProducto: string;
  nombreProducto: string;
  orden: number;
  trazabilidad: string;
  printCard: string | null;
  uom: string;
  maquina: string;
}

export interface OrdenData {
  unidad: string;
  claveUnidad: string;
  cantidad: number;
}

export interface ValoresTecnicosData {
  piezasPorCaja: number;
  wicketPorCaja: number;
  cajasXtarima: number;
  cantPerforaciones: number;
}

export interface ConsolidateProductData {
  etiqueta: EtiquetaData;
  orden: OrdenData;
  valoresTecnicos: ValoresTecnicosData;
}

export interface ActiveVerificationData {
  id: number;
  lote: string; // Orden de producción (ej: "25132")
  producto: string; // ID interno del producto (ej: "5135")
  cliente: string;
  fechaInicio: string;
  avanceTarimas: number;
  // **NOTA:** Faltan campos como 'productName' e 'inspector' que tu UI necesita.
  // **SOLUCIÓN:** Tendrás que hacer un GET adicional dentro del contexto para enriquecer los datos si son necesarios.
}

export interface DashboardData {
    verificacionId: number;
    productoInfo: string;
    loteOrden: string;
    piezasMeta: number;
    piezasActuales: number;
    porcentajeAvance: number; // 0-100
    cajasActuales: number;
    tarimasActuales: number;
    tarimasTotalesEstimadas: number;
    estado: string;
    tiempoTranscurridoMinutos: number;
}