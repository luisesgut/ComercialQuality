// src/hooks/useDestinyEtiqueta.ts (Nuevo hook)

import { useState, useCallback } from 'react';
import { DestinyEtiquetaData } from '@/app/types/verification-types';
import { classifyApiError } from "@/lib/api-error";

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
        const ctx = `ItemNo ${inputs.ItemNo} / Lot ${inputs.InventoryLot}`;

        let response: Response;
        try {
            response = await fetch(url);
        } catch (err) {
            const classified = classifyApiError(err, undefined, ctx);
            throw new Error(`${classified.message} ${classified.hint}`);
        }

        if (!response.ok) {
            const classified = classifyApiError(new Error(`HTTP ${response.status}`), response.status, ctx);
            throw new Error(`${classified.message} ${classified.hint}`);
        }

        const result: DestinyEtiquetaData = await response.json();

        if (!result || !result.prodEtiquetasDestiny) {
            const classified = classifyApiError(new Error("Sin resultados"), 404, ctx);
            throw new Error(`${classified.message} ${classified.hint}`);
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