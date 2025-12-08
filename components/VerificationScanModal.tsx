// src/components/VerificationScanModal.tsx
"use client"

import React, { useState } from "react"
// Reutilizamos el hook que hace los 3 GETs (Etiqueta, Orden, Valores Técnicos)
import { useVerificationData } from "@/hooks/useVerificationData" 
import { ConsolidateProductData } from "@/app/types/verification-types" // Asegura la ruta
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, QrCode, AlertCircle, CheckCircle, Search, Package } from "lucide-react"

// Propiedades que el Modal necesita
interface VerificationScanModalProps {
  verificacionId: number // El ID de la verificación activa (se pasa desde VerificationDetail)
  onClose: () => void // Función para cerrar el modal
  onSuccess: () => void // Función para refrescar la lista/dashboard tras éxito
}

// URL Base de la API
const API_BASE_URL = "http://172.16.10.31/api";

export function VerificationScanModal({ verificacionId, onClose, onSuccess }: VerificationScanModalProps) {
  
  const [trazabilityCode, setTrazabilityCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // Para el POST
  const [localError, setLocalError] = useState<string | null>(null);

  // Uso del hook de GETs
  const {
    consolidatedData,
    isFetching,
    error: fetchError,
    fetchData,
  } = useVerificationData();

  // Función para manejar la acción de escanear (Buscar datos O Registrar)
  const handleScanAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // ------------------------------------------------------------------
    // 1. SI NO TENEMOS DATOS: Ejecutar la búsqueda (GETs encadenados)
    // ------------------------------------------------------------------
    if (!consolidatedData) {
        if (!trazabilityCode) {
            setLocalError("Por favor, ingrese el código de trazabilidad.");
            return;
        }
        // Llama a la función del hook para iniciar los 3 GETs
        fetchData(trazabilityCode); 
        return; 
    }

    // ------------------------------------------------------------------
    // 2. SI YA TENEMOS DATOS: Ejecutar el POST a /registrar-escaneo
    // ------------------------------------------------------------------
    
    setIsSubmitting(true);

    const { etiqueta, orden, valoresTecnicos } = consolidatedData as ConsolidateProductData;
    const piezasPorCaja = Number((etiqueta as any).valor) || valoresTecnicos.piezasPorCaja;

    // Construcción del BODY para el POST a /registrar-escaneo
    const postBody = {
      verificacionId: verificacionId,
      trazabilidad: etiqueta.trazabilidad, 
      qtyUomEtiqueta: etiqueta.uom, 
      piezasPorCajaDb: piezasPorCaja,
      cajasPorTarima: valoresTecnicos.cajasXtarima, 
      cantidadOrden: orden.cantidad, 
      unidadOrden: orden.claveUnidad, 
    };
    
    // 

    try {
      const urlPost = `${API_BASE_URL}/Verificacion/registrar-escaneo`;
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
        throw new Error(errorData.detail || `Error (${response.status}) al registrar el escaneo.`);
      }

      // Éxito: Cierra el modal y notifica al componente padre para refrescar
      onSuccess(); 

    } catch (err: any) {
      setLocalError(err.message || "Error de conexión al intentar registrar el escaneo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------------------------------------
  // RENDERIZADO DEL MODAL
  // ------------------------------------------------------------------

  // En un escenario real, esto se envolvería en un componente de Modal/Dialog de shadcn
  const piezasPorCajaDisplay =
    (consolidatedData && Number((consolidatedData.etiqueta as any)?.valor)) ||
    consolidatedData?.valoresTecnicos.piezasPorCaja;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" /> Registrar Escaneo
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting}>
            &times;
          </Button>
        </div>

        <p className="text-muted-foreground text-sm">Verificación activa ID: **{verificacionId}**</p>
        
        <form onSubmit={handleScanAction} className="space-y-4">
            
            {/* Input de Trazabilidad */}
            <div className="space-y-2">
              <Label htmlFor="trazabilidad" className="text-card-foreground">Código de Trazabilidad</Label>
              <div className="relative">
                <Input
                  id="trazabilidad"
                  placeholder="Escanee o ingrese el código de la etiqueta"
                  value={trazabilityCode}
                  onChange={(e) => setTrazabilityCode(e.target.value)}
                  className="pl-4 h-12 text-lg text-center font-mono"
                  // Deshabilitar el input si ya tenemos datos listos para el POST
                  disabled={isFetching || isSubmitting || !!consolidatedData} 
                  required
                />
              </div>
            </div>

            {/* Mensajes de Estado */}
            {(fetchError || localError) && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {fetchError || localError}
              </div>
            )}

            {/* FASE: Datos Obtenidos (Confirmación antes del POST) */}
            {consolidatedData && !isFetching && !isSubmitting && (
              <div className="bg-green-50/50 p-4 rounded-lg border border-green-200 space-y-3">
                <p className="font-semibold text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Datos Listos
                </p>
                <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium text-gray-800">{consolidatedData.etiqueta.nombreProducto}</p>
                      <p className="text-gray-600 text-xs">Clave: {consolidatedData.etiqueta.claveProducto}</p>
                      {piezasPorCajaDisplay && (
                        <p className="text-gray-600 text-xs">
                          Piezas por caja: <span className="font-semibold text-gray-800">{piezasPorCajaDisplay}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/70 rounded-md p-2 border border-green-100">
                      <p className="text-xs text-gray-500 uppercase">Trazabilidad</p>
                      <p className="font-semibold">{consolidatedData.etiqueta.trazabilidad}</p>
                    </div>
                    <div className="bg-white/70 rounded-md p-2 border border-green-100">
                      <p className="text-xs text-gray-500 uppercase">Orden / Lote</p>
                      <p className="font-semibold">{consolidatedData.etiqueta.orden}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/70 rounded-md p-2 border border-green-100">
                      <p className="text-xs text-gray-500 uppercase">UOM</p>
                      <p className="font-semibold">{consolidatedData.etiqueta.uom}</p>
                    </div>
                    <div className="bg-white/70 rounded-md p-2 border border-green-100">
                      <p className="text-xs text-gray-500 uppercase">Área</p>
                      <p className="font-semibold">{consolidatedData.etiqueta.area}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/70 rounded-md p-2 border border-green-100">
                      <p className="text-xs text-gray-500 uppercase">Máquina</p>
                      <p className="font-semibold">{consolidatedData.etiqueta.maquina}</p>
                    </div>
                    <div className="bg-white/70 rounded-md p-2 border border-green-100">
                      <p className="text-xs text-gray-500 uppercase">Print Card</p>
                      <p className="font-semibold">{consolidatedData.etiqueta.printCard || "N/A"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/70 rounded-md p-2 border border-green-100">
                      <p className="text-xs text-gray-500 uppercase">Cantidad Orden</p>
                      <p className="font-semibold">
                        {consolidatedData.orden.cantidad} {consolidatedData.orden.claveUnidad}
                      </p>
                    </div>
                    <div className="bg-white/70 rounded-md p-2 border border-green-100">
                      <p className="text-xs text-gray-500 uppercase">Piezas por Caja</p>
                      <p className="font-semibold">
                        {Number((consolidatedData.etiqueta as any).valor) || consolidatedData.valoresTecnicos.piezasPorCaja}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Botón de Acción Principal */}
            <Button 
                type="submit" 
                className="w-full h-12 text-lg" 
                disabled={isFetching || isSubmitting || !trazabilityCode}
            >
              {isFetching ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Buscando Datos...</>
              ) : isSubmitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Registrando Escaneo...</>
              ) : consolidatedData ? (
                "Confirmar y Registrar Caja"
              ) : (
                <><Search className="w-5 h-5 mr-2" /> Buscar Datos de Etiqueta</>
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
