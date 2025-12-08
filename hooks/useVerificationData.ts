// src/hooks/useVerificationData.ts

import { useState, useEffect, useCallback } from 'react';
import { ConsolidateProductData } from "@/app/types/verification-types"; // Asegúrate de que la ruta sea correcta

// URL Base de tu API (es bueno mantenerla centralizada, pero la dejaremos aquí por ahora)
const API_BASE_URL = "http://172.16.10.31/api";

interface HookResult {
  consolidatedData: ConsolidateProductData | null;
  isFetching: boolean;
  error: string | null;
  // Función para iniciar la búsqueda
  fetchData: (trazabilidad: string) => void;
}

export function useVerificationData(): HookResult {
  const [consolidatedData, setConsolidatedData] = useState<ConsolidateProductData | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Usamos useCallback para que la función sea estable
  const fetchData = useCallback(async (trazabilityCode: string) => {
    if (!trazabilityCode) return;

    setIsFetching(true);
    setError(null);
    setConsolidatedData(null);

    try {
        // ------------------------------------------------------------------
        // PASO 1: GET de la Etiqueta Individual
        // ------------------------------------------------------------------
        const urlEtiqueta = `${API_BASE_URL}/EtiquetaIndividual/individual/${trazabilityCode}`;
        const resEtiqueta = await fetch(urlEtiqueta);
        
        if (!resEtiqueta.ok) {
            throw new Error(`Trazabilidad **${trazabilityCode}** no encontrada o inválida.`);
        }
        const etiquetaData = await resEtiqueta.json();

        const { orden, claveProducto } = etiquetaData;

        // ------------------------------------------------------------------
        // PASO 2: GET de Detalle de la Orden
        // ------------------------------------------------------------------
        const urlOrden = `${API_BASE_URL}/CatOrden/detalle?orden=${orden}&claveProducto=${claveProducto}`;
        const resOrden = await fetch(urlOrden);

        if (!resOrden.ok) {
            throw new Error(`Error al obtener el detalle de la orden **${orden}**.`);
        }
        const ordenData = await resOrden.json();

        // ------------------------------------------------------------------
        // PASO 3: GET de Valores Técnicos
        // ------------------------------------------------------------------
        const urlValores = `${API_BASE_URL}/ValoresTecnicosIndividual/ByProducto/${claveProducto}`;
        const resValores = await fetch(urlValores);

        if (!resValores.ok) {
            throw new Error(`No se encontraron valores técnicos para el producto **${claveProducto}**.`);
        }
        const valoresTecnicosArray = await resValores.json();
        
        if (valoresTecnicosArray.length === 0) throw new Error("No se encontraron valores técnicos.");
        const valoresTecnicosData = valoresTecnicosArray[0]; 

        // ------------------------------------------------------------------
        // CONSOLIDAR DATOS
        // ------------------------------------------------------------------
        setConsolidatedData({
            etiqueta: etiquetaData,
            orden: ordenData,
            valoresTecnicos: valoresTecnicosData,
        } as ConsolidateProductData); // Afirmamos el tipo ya que la estructura se ajusta

    } catch (err: any) {
        console.error("Error en useVerificationData:", err);
        setError(err.message || "Un error desconocido ocurrió durante la búsqueda de datos.");
    } finally {
        setIsFetching(false);
    }
  }, []); // Dependencias vacías, solo se crea una vez

  return { consolidatedData, isFetching, error, fetchData };
}