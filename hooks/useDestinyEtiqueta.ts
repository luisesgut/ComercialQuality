// src/hooks/useDestinyEtiqueta.ts (Nuevo hook)

import { useState, useCallback } from 'react';
import { DestinyEtiquetaData } from '@/app/types/verification-types'; 

const API_BASE_URL = "http://172.16.10.31/api";

interface DestinySearchInputs {
  ItemNo: string;
  InventoryLot: string;
  ShippingUnitID: string;
}

export function useDestinyEtiqueta() {
  const [data, setData] = useState<DestinyEtiquetaData | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (inputs: DestinySearchInputs) => {
    if (!inputs.ItemNo || !inputs.InventoryLot || !inputs.ShippingUnitID) return;

    setIsFetching(true);
    setError(null);
    setData(null);

    try {
        const url = `${API_BASE_URL}/EtiquetaIndividual/destiny/search-by-shipping?ItemNo=${inputs.ItemNo}&InventoryLot=${inputs.InventoryLot}&ShippingUnitID=${inputs.ShippingUnitID}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error (${response.status}) al buscar datos Destiny.`);
        }
        
        const result: DestinyEtiquetaData = await response.json();
        
        if (!result || !result.prodEtiquetasDestiny) {
             throw new Error("Datos de producto Destiny incompletos o no encontrados.");
        }
        
        setData(result);

    } catch (err: any) {
        setError(err.message || "Error de conexión con la API Destiny.");
    } finally {
        setIsFetching(false);
    }
  }, []);

  return { destinyData: data, isFetching, error, fetchData };
}