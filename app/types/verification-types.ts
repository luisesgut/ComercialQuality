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
  tipoEmpaque?: string; // Solo Destiny: obtenido de DestinyDatos
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
    productoInfo: string | null;
    nombreProducto?: string | null;
    claveProducto?: string | null;
    loteOrden: string;
    piezasMeta: number;
    piezasActuales: number;
    porcentajeAvance: number; // 0-100
    cajasActuales: number;
    tarimasActuales: number;
    tarimasTotalesEstimadas: number;
    estado: string;
    tiempoTranscurridoMinutos: number;
    cliente : "BIOFLEX" | "DESTINY" | "QUALITY";
    printCard?: string | null;
    piezasPorCaja?: number;
}

export interface VerificationLookupDefecto {
  detalle: string;
  familia: string;
  cantidad: number;
  comentario: string | null;
}

export interface VerificationLookupCaja {
  detalleId: number;
  identificador: string;
  cantidad: number;
  piezasAuditadas: number;
  tieneDefectos: boolean;
  comentarios: string | null;
  horaEscaneo: string;
  usuarioValidador?: string | null;
  defectos: VerificationLookupDefecto[];
  fotos: string[];
}

export interface VerificationLookupTarimaColaborador {
  usuario?: string | null;
  nombre?: string | null;
  cajasEscaneadas?: number | null;
  cajasRegistradas?: number | null;
}

export interface VerificationLookupTarimaAbierta {
  tarimaId: number;
  numeroTarima: number;
  cajasLlevamos?: number;
  cajasEscaneadas?: number;
  meta?: number;
  cajasMeta?: number;
  usuarioCreo?: string | null;
  usuario?: string | null;
  usuarioReviso?: string | null;
  usuarioRevision?: string | null;
  revisadoPor?: string | null;
  revisor?: string | null;
  fechaInicio?: string | null;
  fechaCierre?: string | null;
  estado?: string | null;
  colaboradores?: VerificationLookupTarimaColaborador[] | null;
  cajas?: VerificationLookupCaja[];
}

export interface VerificationLookupTarimaTerminada {
  tarimaId: number;
  numeroTarima: number;
  cajasRegistradas: number;
  usuario: string;
  usuarioReviso?: string | null;
  usuarioRevision?: string | null;
  revisadoPor?: string | null;
  revisor?: string | null;
  usuarioCerro?: string | null;
  colaboradores?: VerificationLookupTarimaColaborador[] | null;
  fechaCierre: string;
  estatusCierre: string | null;
  comentarioCierre: string | null;
  cajas: VerificationLookupCaja[];
}

export interface VerificationLookupResponse {
  existe: boolean;
  loteResuelto: string | null;
  verificacionId: number | null;
  terminada: boolean;
  dashboard: DashboardData | null;
  tarimasTerminadas: VerificationLookupTarimaTerminada[] | null;
  tarimasAbiertas: VerificationLookupTarimaAbierta[] | null;
}

export interface DestinyEtiquetaData {
  id: number;
  idLote: number;
  area: string;
  claveProducto: string;
  nombreProducto: string;
  maquina: string;
  turno: string;
  claveOperador: string;
  operador: string;
  orden: number; // -> Se usará para POST: lote
  printCard: string | null; // -> Se usará para POST
  claveUnidad: string; // -> Corresponde a 'unidadOrden' (CASES)
  piezas: number; // -> Cantidad de la orden
  otSispro: string | null;
  bobinaMaster: string;
  // Objeto anidado
  prodEtiquetasDestiny: {
    id: number;
    prodEtiquetaIndividualId: number;
    itemNo: string;
    lote: string;
    name: string;
    inventoryLot: string;
    customerPO: string;
    uom: string; // -> Corresponde a 'unidad' (CASES)
    shippingUnitID: string;
    qtyUOM: string; // -> Piezas por caja (string: "5000")
  };
}

export interface DestinyConsolidatedData {
    etiqueta: DestinyEtiquetaData;
    // Destiny no requiere GETs 2 y 3 adicionales, los datos vienen en el payload.
}
