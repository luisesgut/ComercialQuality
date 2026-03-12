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
