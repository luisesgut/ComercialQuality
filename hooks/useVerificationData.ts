import { useState, useCallback } from 'react';
import { ConsolidateProductData, DestinyEtiquetaData } from "@/app/types/verification-types";
import { classifyApiError, formatApiError } from "@/lib/api-error";

// URL Base de tu API
const API_BASE_URL = "http://172.16.10.31/api";

interface HookResult {
  consolidatedData: ConsolidateProductData | null;
  isFetching: boolean;
  error: string | null;
  // Métodos de entrada
  fetchByBioflex: (trazabilidad: string) => Promise<void>;
  fetchByDestiny: (itemNo: string, lot: string) => Promise<void>;
  fetchByQuality: (po2: string, itemNo: string) => Promise<void>;
  resetData: () => void;
}

export function useVerificationData(): HookResult {
  const [consolidatedData, setConsolidatedData] = useState<ConsolidateProductData | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetData = () => {
    setConsolidatedData(null);
    setError(null);
    setIsFetching(false);
  };

  // --- LÓGICA COMPARTIDA: Pasos 2 y 3 (Orden y Valores Técnicos) ---
  const fetchComplementaryData = async (etiquetaData: any, origen: 'BIOFLEX' | 'DESTINY' | 'QUALITY', tipoEmpaque?: string) => {
    try {
        let ordenSearch = "";
        let claveProductoSearch = "";

        // Normalizamos los datos según el origen para poder buscar en las otras APIs
        if (origen === 'BIOFLEX') {
            ordenSearch = etiquetaData.orden;
            claveProductoSearch = etiquetaData.claveProducto;
        } else {
            // Para Destiny, usamos directamente los campos que vienen en la respuesta
            // "orden": 28596 y "claveProducto": "PT04034"
            ordenSearch = etiquetaData.orden;
            claveProductoSearch = etiquetaData.claveProducto;
        }

        if (!ordenSearch || !claveProductoSearch) {
             // Si no hay orden o item number, solo devolvemos la etiqueta sin enriquecer
             setConsolidatedData({
                etiqueta: etiquetaData,
                orden: null as any,
                valoresTecnicos: null as any,
                ...(tipoEmpaque ? { tipoEmpaque } : {}),
             });
             return;
        }

        // ------------------------------------------------------------------
        // PASO 2: GET de Detalle de la Orden
        // ------------------------------------------------------------------
        const urlOrden = `${API_BASE_URL}/CatOrden/detalle?orden=${ordenSearch}&claveProducto=${claveProductoSearch}`;
        let resOrden: Response;
        try {
            resOrden = await fetch(urlOrden);
        } catch (err) {
            throw classifyApiError(err, undefined, `orden ${ordenSearch}`);
        }
        if (!resOrden.ok) {
            throw classifyApiError(new Error(`HTTP ${resOrden.status}`), resOrden.status, `orden ${ordenSearch}`);
        }
        const ordenData = await resOrden.json();

        // ------------------------------------------------------------------
        // PASO 3: GET de Valores Técnicos
        // ------------------------------------------------------------------
        const valoresEndpoint =
            origen === 'BIOFLEX'
                ? "ByProductoBfx"
                : "ByProducto";
        const urlValores = `${API_BASE_URL}/ValoresTecnicosIndividual/${valoresEndpoint}/${encodeURIComponent(claveProductoSearch)}`;
        let resValores: Response;
        try {
            resValores = await fetch(urlValores);
        } catch (err) {
            throw classifyApiError(err, undefined, `producto ${claveProductoSearch}`);
        }

        let valoresTecnicosData = null;
        if (resValores.ok) {
            const valoresTecnicosPayload = await resValores.json();
            const rawValoresTecnicos = Array.isArray(valoresTecnicosPayload)
                ? valoresTecnicosPayload[0]
                : valoresTecnicosPayload;

            if (rawValoresTecnicos) {
                valoresTecnicosData = {
                    piezasPorCaja: Number(rawValoresTecnicos.piezasPorCaja) || 0,
                    wicketPorCaja: Number(rawValoresTecnicos.wicketPorCaja) || 0,
                    cajasXtarima: Number(rawValoresTecnicos.cajasXtarima ?? rawValoresTecnicos.cajasXTarima) || 0,
                    cantPerforaciones: Number(rawValoresTecnicos.cantPerforaciones) || 0,
                };
            }
        }

        if (!valoresTecnicosData) {
            throw classifyApiError(
                new Error("No encontrado"),
                resValores.ok ? 404 : resValores.status,
                `valores técnicos de ${claveProductoSearch}`
            );
        }

        // ------------------------------------------------------------------
        // CONSOLIDAR DATOS FINALES
        // ------------------------------------------------------------------
        setConsolidatedData({
            etiqueta: etiquetaData,
            orden: ordenData,
            valoresTecnicos: valoresTecnicosData,
            ...(tipoEmpaque ? { tipoEmpaque } : {}),
        } as ConsolidateProductData);

    } catch (err: any) {
        throw err; // Re-lanzamos para manejarlo en la función principal
    }
  };


  // --- ENTRADA 1: BIOFLEX ---
  const fetchByBioflex = useCallback(async (trazabilityCode: string) => {
    if (!trazabilityCode) return;
    setIsFetching(true);
    setError(null);
    setConsolidatedData(null);

    try {
        const urlProduccionBolseo = `${API_BASE_URL}/ProduccionBolseo/${encodeURIComponent(trazabilityCode)}`;
        let resProduccionBolseo: Response;
        try {
            resProduccionBolseo = await fetch(urlProduccionBolseo);
        } catch (err) {
            throw classifyApiError(err, undefined, `trazabilidad ${trazabilityCode}`);
        }
        if (!resProduccionBolseo.ok) {
            throw classifyApiError(
                new Error(`HTTP ${resProduccionBolseo.status}`),
                resProduccionBolseo.status,
                `trazabilidad ${trazabilityCode}`
            );
        }
        const produccionBolseoData = await resProduccionBolseo.json();

        const claveProducto = String(produccionBolseoData?.codigoProducto ?? "").trim();
        const pedidosRaw = String(produccionBolseoData?.pedidos ?? "").trim();
        const orden = Number(pedidosRaw);

        if (!claveProducto || !pedidosRaw || Number.isNaN(orden)) {
            throw classifyApiError(
                new Error("Respuesta incompleta"),
                404,
                `trazabilidad ${trazabilityCode}`
            );
        }

        const etiquetaData = {
            id: 0,
            area: String(produccionBolseoData?.area ?? "BIOFLEX").trim(),
            claveProducto,
            nombreProducto: String(produccionBolseoData?.producto ?? "").trim(),
            orden,
            trazabilidad: trazabilityCode,
            printCard: String(produccionBolseoData?.printCard ?? "").trim() || null,
            piezas: Number(produccionBolseoData?.piezas) || 0,
            uom: "",
            maquina: "",
        };

        await fetchComplementaryData(etiquetaData, 'BIOFLEX');

    } catch (err: any) {
        console.error("Error Bioflex:", err);
        setError(err.message || formatApiError({ type: "unknown", message: "Error buscando Bioflex.", hint: "Intente nuevamente." }));
    } finally {
        setIsFetching(false);
    }
  }, []);


  // --- ENTRADA 2: DESTINY ---
  const fetchByDestiny = useCallback(async (itemNo: string, lot: string) => {
    setIsFetching(true);
    setError(null);
    setConsolidatedData(null);

    try {
        const urlDestiny = `${API_BASE_URL}/EtiquetaIndividual/destiny/search-by-lot?itemNo=${itemNo}&inventoryLot=${lot}`;
        let response: Response;
        try {
            response = await fetch(urlDestiny);
        } catch (err) {
            throw classifyApiError(err, undefined, `ItemNo ${itemNo}`);
        }
        if (!response.ok) {
            throw classifyApiError(new Error(`HTTP ${response.status}`), response.status, `ItemNo ${itemNo} / Lot ${lot}`);
        }

        const data: DestinyEtiquetaData = await response.json();
        if (!data || !data.prodEtiquetasDestiny) {
            throw classifyApiError(new Error("Respuesta incompleta"), 404, `ItemNo ${itemNo}`);
        }

        // Obtener tipoEmpaque de DestinyDatos
        let tipoEmpaque: string | undefined;
        try {
            const urlDatos = `${API_BASE_URL}/DestinyDatos?codigoProducto=${encodeURIComponent(data.claveProducto)}`;
            const resDatos = await fetch(urlDatos);
            if (resDatos.ok) {
                const datosJson = await resDatos.json();
                // Puede ser array o objeto único
                const item = Array.isArray(datosJson) ? datosJson[0] : datosJson;
                if (item?.tipoEmpaque) tipoEmpaque = item.tipoEmpaque;
            }
        } catch {
            // Si falla, continuamos sin tipoEmpaque (no es bloqueante)
        }

        await fetchComplementaryData(data, 'DESTINY', tipoEmpaque);

    } catch (err: any) {
        console.error("Error Destiny:", err);
        setError(err.message || formatApiError({ type: "unknown", message: "Error buscando Destiny.", hint: "Intente nuevamente." }));
    } finally {
        setIsFetching(false);
    }
  }, []);

  // --- ENTRADA 3: QUALITY ---
  const fetchByQuality = useCallback(async (po2: string, itemNo: string) => {
    if (!po2 || !itemNo) return;
    setIsFetching(true);
    setError(null);
    setConsolidatedData(null);

    try {
        const urlQuality = `${API_BASE_URL}/EtiquetaIndividual/quality/search?u_po2=${encodeURIComponent(po2)}&u_itemNo=${encodeURIComponent(itemNo)}`;
        let response: Response;
        try {
            response = await fetch(urlQuality);
        } catch (err) {
            throw classifyApiError(err, undefined, `Lot ${po2} / Item ${itemNo}`);
        }
        if (!response.ok) {
            throw classifyApiError(new Error(`HTTP ${response.status}`), response.status, `Lot ${po2} / Item ${itemNo}`);
        }

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            throw classifyApiError(new Error("Sin resultados"), 404, `Lot ${po2} / Item ${itemNo}`);
        }

        const first = data[0];
        const etiquetaData = {
          id: Number(first.id) || 0,
          area: "QUALITY",
          claveProducto: first.clave || "",
          nombreProducto: first.producto || "",
          orden: Number(first.pedido) || 0,
          trazabilidad: String(first.pedido || ""),
          printCard: null,
          uom: "",
          maquina: "",
        };

        await fetchComplementaryData(etiquetaData, 'QUALITY');

    } catch (err: any) {
        console.error("Error Quality:", err);
        setError(err.message || formatApiError({ type: "unknown", message: "Error buscando Quality.", hint: "Intente nuevamente." }));
    } finally {
        setIsFetching(false);
    }
  }, []);

  return { consolidatedData, isFetching, error, fetchByBioflex, fetchByDestiny, fetchByQuality, resetData };
}
