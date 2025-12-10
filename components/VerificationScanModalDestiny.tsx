// src/components/VerificationScanModalDestiny.tsx
"use client"

import React, { useState } from "react"
import { useDestinyEtiqueta } from "@/hooks/useDestinyEtiqueta" 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, QrCode, AlertCircle, CheckCircle, Package, Hash, Search } from "lucide-react"
import { DestinyEtiquetaData } from "@/app/types/verification-types" 


interface VerificationScanModalDestinyProps {
  verificacionId: number 
  onClose: () => void 
  onSuccess: () => void 
}

const API_BASE_URL = "http://172.16.10.31/api";

export function VerificationScanModalDestiny({ verificacionId, onClose, onSuccess }: VerificationScanModalDestinyProps) {
  
  // --- ESTADOS DE INPUTS ---
  const [itemNoInput, setItemNoInput] = useState("");
  const [inventoryLotInput, setInventoryLotInput] = useState("");
  const [shippingUnitIDInput, setShippingUnitIDInput] = useState("");
  const [consecutivoInput, setConsecutivoInput] = useState(""); // <-- EL INPUT MANUAL ADICIONAL

  const [isSubmitting, setIsSubmitting] = useState(false); // Para el POST
  const [localError, setLocalError] = useState<string | null>(null);

  // --- USO DEL HOOK DESTINY ---
  const { destinyData, isFetching, error: fetchError, fetchData } = useDestinyEtiqueta();


  // Función que maneja la búsqueda de datos (si no los tenemos) o el registro (POST)
  const handleScanAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    // ------------------------------------------------------------------
    // 1. FASE: BÚSQUEDA DE DATOS (Si no hay datos)
    // ------------------------------------------------------------------
    if (!destinyData) {
        if (!itemNoInput || !inventoryLotInput || !shippingUnitIDInput) {
            setLocalError("Complete todos los campos de búsqueda.");
            return;
        }
        // Llama al hook para hacer el GET con los 3 parámetros
        fetchData({ 
            ItemNo: itemNoInput, 
            InventoryLot: inventoryLotInput, 
            ShippingUnitID: shippingUnitIDInput 
        });
        return; 
    }

    // ------------------------------------------------------------------
    // 2. FASE: REGISTRAR ESCANEO (POST)
    // ------------------------------------------------------------------
    
    if (!consecutivoInput || Number(consecutivoInput) <= 0) {
        setLocalError("Debe ingresar un valor válido para el Consecutivo.");
        return;
    }
    
    setIsSubmitting(true);

    const data = destinyData as DestinyEtiquetaData;

    // Construcción del BODY para el POST a /registrar-escaneo-destiny
    const postBody = {
      verificacionId: verificacionId, // Del prop
      ordenProduccion: String(data.orden), // -> orden (28596) como string
      consecutivo: Number(consecutivoInput), // -> INPUT MANUAL
      itemNumber: data.prodEtiquetasDestiny.itemNo, // -> prodEtiquetasDestiny.itemNo (61953-11)
      qtyUomEtiqueta: data.prodEtiquetasDestiny.qtyUOM, // -> prodEtiquetasDestiny.qtyUOM (1000)
    };
    

    try {
      const urlPost = `${API_BASE_URL}/Verificacion/registrar-escaneo-destiny`;
      const response = await fetch(urlPost, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
          errorData.detail ||
          `Error (${response.status}) al registrar el escaneo Destiny.`
        );
      }

      onSuccess(); // Cierra el modal y refresca el dashboard

    } catch (err: any) {
      setLocalError(err.message || "Error de conexión al intentar registrar el escaneo Destiny.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------------------------------------
  // RENDERIZADO DEL MODAL
  // ------------------------------------------------------------------

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" /> Registrar Caja Destiny
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting}>
            &times;
          </Button>
        </div>

        <p className="text-muted-foreground text-sm">Verificación activa ID: **{verificacionId}**</p>
        
        <form onSubmit={handleScanAction} className="space-y-4">
            
            {(fetchError || localError) && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {fetchError || localError}
              </div>
            )}

            {/* 1. INPUTS DE BÚSQUEDA (Mostrados si NO hay datos) */}
            {!destinyData && (
                <div className="space-y-4 pt-2">
                    <h4 className="font-semibold text-gray-700">Parámetros de Búsqueda</h4>
                    <div className="space-y-2">
                        <Label htmlFor="itemNo">Item No</Label>
                        <Input id="itemNo" value={itemNoInput} onChange={(e) => setItemNoInput(e.target.value)} disabled={isFetching} required placeholder="Ej: 61953-11" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="inventoryLot">Inventory Lot</Label>
                        <Input id="inventoryLot" value={inventoryLotInput} onChange={(e) => setInventoryLotInput(e.target.value)} disabled={isFetching} required placeholder="Ej: 13915" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="shippingUnitID">Shipping Unit ID</Label>
                        <Input id="shippingUnitID" value={shippingUnitIDInput} onChange={(e) => setShippingUnitIDInput(e.target.value)} disabled={isFetching} required placeholder="Ej: 28596" />
                    </div>
                </div>
            )}

            {/* 2. DATOS OBTENIDOS + INPUT MANUAL (Mostrados si HAY datos) */}
            {destinyData && (
                <div className="space-y-4">
                    <div className="bg-green-50/50 p-4 rounded-lg border border-green-200 space-y-3">
                        <p className="font-semibold text-green-700 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Datos de Etiqueta (Listos para POST)
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                            <div className="bg-white/70 rounded-md p-2 border border-green-100 col-span-2">
                                <p className="text-xs text-gray-500 uppercase">Producto</p>
                                <p className="font-semibold">{destinyData.nombreProducto}</p>
                            </div>
                            <div className="bg-white/70 rounded-md p-2 border border-green-100">
                                <p className="text-xs text-gray-500 uppercase">Orden Producción</p>
                                <p className="font-semibold">{destinyData.orden}</p>
                            </div>
                            <div className="bg-white/70 rounded-md p-2 border border-green-100">
                                <p className="text-xs text-gray-500 uppercase">Piezas por Caja</p>
                                <p className="font-semibold">{destinyData.prodEtiquetasDestiny.qtyUOM} {destinyData.prodEtiquetasDestiny.uom}</p>
                            </div>
                        </div>
                    </div>

                    {/* INPUT MANUAL REQUERIDO: Consecutivo */}
                    <div className="space-y-2">
                        <Label htmlFor="consecutivo">Consecutivo (MANUAL) *</Label>
                        <Input 
                            id="consecutivo"
                            type="number"
                            value={consecutivoInput}
                            onChange={(e) => setConsecutivoInput(e.target.value)}
                            disabled={isSubmitting}
                            required
                            placeholder="Ingrese el número consecutivo de esta caja"
                        />
                    </div>
                </div>
            )}
            
            {/* Botón de Acción Principal */}
            <Button 
                type="submit" 
                className="w-full h-12 text-lg" 
                disabled={isFetching || isSubmitting}
            >
              {isFetching ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Buscando Datos...</>
              ) : isSubmitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Registrando Escaneo...</>
              ) : destinyData ? (
                "Confirmar Registro de Consecutivo"
              ) : (
                <><Search className="w-5 h-5 mr-2" /> Buscar Datos</>
              )}
            </Button>
            
            <Button type="button" variant="outline" onClick={onClose} className="w-full" disabled={isSubmitting}>
                Cerrar
            </Button>
        </form>
      </div>
    </div>
  )
}
