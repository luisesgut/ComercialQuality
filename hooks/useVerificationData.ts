import { useState, useCallback } from 'react';
import { ConsolidateProductData, DestinyEtiquetaData } from "@/app/types/verification-types";

// URL Base de tu API
const API_BASE_URL = "http://172.16.10.31/api";

interface HookResult {
  consolidatedData: ConsolidateProductData | null;
  isFetching: boolean;
  error: string | null;
  // Métodos de entrada
  fetchByBioflex: (trazabilidad: string) => Promise<void>;
  fetchByDestiny: (itemNo: string, lot: string, shippingId: string) => Promise<void>;
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
  const fetchComplementaryData = async (etiquetaData: any, origen: 'BIOFLEX' | 'DESTINY' | 'QUALITY') => {
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
                valoresTecnicos: null as any
             });
             return;
        }

        // ------------------------------------------------------------------
        // PASO 2: GET de Detalle de la Orden
        // ------------------------------------------------------------------
        const urlOrden = `${API_BASE_URL}/CatOrden/detalle?orden=${ordenSearch}&claveProducto=${claveProductoSearch}`;
        const resOrden = await fetch(urlOrden);

        if (!resOrden.ok) {
            throw new Error(`Error al obtener el detalle de la orden **${ordenSearch}**.`);
        }
        const ordenData = await resOrden.json();

        // ------------------------------------------------------------------
        // PASO 3: GET de Valores Técnicos
        // ------------------------------------------------------------------
        const urlValores = `${API_BASE_URL}/ValoresTecnicosIndividual/ByProducto/${claveProductoSearch}`;
        const resValores = await fetch(urlValores);
        
        let valoresTecnicosData = null;

        if (resValores.ok) {
            const valoresTecnicosArray = await resValores.json();
            if (valoresTecnicosArray && valoresTecnicosArray.length > 0) {
                valoresTecnicosData = valoresTecnicosArray[0];
            }
        } 
        
        // Si fallan los valores técnicos, ¿queremos detener todo? 
        // Por ahora lanzamos error si es crítico, o permitimos null si es opcional.
        // Asumiremos que son necesarios:
        if (!valoresTecnicosData) throw new Error(`No se encontraron valores técnicos para **${claveProductoSearch}**.`);

        // ------------------------------------------------------------------
        // CONSOLIDAR DATOS FINALES
        // ------------------------------------------------------------------
        setConsolidatedData({
            etiqueta: etiquetaData, 
            orden: ordenData,
            valoresTecnicos: valoresTecnicosData,
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
        const urlEtiqueta = `${API_BASE_URL}/EtiquetaIndividual/individual/${trazabilityCode}`;
        const resEtiqueta = await fetch(urlEtiqueta);
        
        if (!resEtiqueta.ok) throw new Error(`Trazabilidad **${trazabilityCode}** no encontrada.`);
        const etiquetaData = await resEtiqueta.json();

        await fetchComplementaryData(etiquetaData, 'BIOFLEX');

    } catch (err: any) {
        console.error("Error Bioflex:", err);
        setError(err.message || "Error buscando Bioflex.");
    } finally {
        setIsFetching(false);
    }
  }, []);


  // --- ENTRADA 2: DESTINY ---
  const fetchByDestiny = useCallback(async (itemNo: string, lot: string, shippingId: string) => {
    setIsFetching(true);
    setError(null);
    setConsolidatedData(null);

    try {
        const urlDestiny = `${API_BASE_URL}/EtiquetaIndividual/destiny/search-by-shipping?ItemNo=${itemNo}&InventoryLot=${lot}&ShippingUnitID=${shippingId}`;
        const response = await fetch(urlDestiny);
        
        if (!response.ok) throw new Error(`Error (${response.status}) buscando Destiny.`);
        
        const data: DestinyEtiquetaData = await response.json();
        
        if (!data || !data.prodEtiquetasDestiny) throw new Error("Respuesta de API Destiny incompleta.");

        await fetchComplementaryData(data, 'DESTINY');

    } catch (err: any) {
        console.error("Error Destiny:", err);
        setError(err.message || "Error buscando Destiny.");
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
        const response = await fetch(urlQuality);

        if (!response.ok) throw new Error(`Error (${response.status}) buscando Quality.`);

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("No se encontraron datos de Quality con esos parámetros.");
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
        setError(err.message || "Error buscando Quality.");
    } finally {
        setIsFetching(false);
    }
  }, []);

  return { consolidatedData, isFetching, error, fetchByBioflex, fetchByDestiny, fetchByQuality, resetData };
}
