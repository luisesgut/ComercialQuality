"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"

// Hooks personalizados (Asegura que estas rutas existan)
import { useAuth } from "@/lib/auth-context" 
import { useVerificationData } from "@/hooks/useVerificationData" 

// Componentes de UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// Iconos
import { ArrowLeft, Package, Calendar, Hash, FileText, CheckCircle, AlertCircle, Search, QrCode, Grid } from "lucide-react"

// Tipos (Solo se necesitan en el hook, pero se mantienen importados si se usan en el componente principal)
// Aunque eliminamos 'ProductData' ya que el hook devuelve 'ConsolidateProductData'
// Ya no necesitamos definir ProductData aquí
// import {
//   EtiquetaData,
//   OrdenData,
//   ValoresTecnicosData,
//   ConsolidateProductData
// } from "@/app/types/verification-types" 


export function NewVerificationForm() {
  const router = useRouter()
  // Asumo que 'useAuth' existe y proporciona el objeto 'user' para 'validadores'
  const { user } = useAuth() 

  // --- USO DEL HOOK PERSONALIZADO PARA LOS GETS ---
  const { 
      consolidatedData, 
      isFetching, 
      error: fetchError, // Renombrado para evitar conflicto con el estado de error local
      fetchData 
  } = useVerificationData();
  
  // --- ESTADOS LOCALES DE FLUJO ---
  const [trazabilityCode, setTrazabilityCode] = useState("")
  const [verificationStarted, setVerificationStarted] = useState(false); // FASE 2: Inputs Manuales
  const [mode, setMode] = useState<"bioflex" | "destiny" | "quality">("bioflex")

  // El estado de 'isScanned' ahora depende de si se obtuvieron datos
  const isDataAvailable = !!consolidatedData && !fetchError; 
  
  // --- ESTADOS DE LA FASE 2 (Inputs Manuales y POST) ---
  const [clienteInput, setClienteInput] = useState<string>('');
  const [tipoBolsaInput, setTipoBolsaInput] = useState<string>('');
  const [piezasPorWicketInput, setPiezasPorWicketInput] = useState<number | string>(''); 
  const [isSubmitting, setIsSubmitting] = useState(false) // Para el POST
  const [submitError, setSubmitError] = useState<string | null>(null) // Error del POST
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null) // Éxito del POST
  const [destinyItemNo, setDestinyItemNo] = useState("")
  const [destinyInventoryLot, setDestinyInventoryLot] = useState("")
  const [destinyShippingUnitId, setDestinyShippingUnitId] = useState("")
  const [qualityPO2, setQualityPO2] = useState("")
  const [qualityItemNumber, setQualityItemNumber] = useState("")

  
  // ----------------------------------------------------
  // 1. FUNCIÓN DE INICIO DE GETS (Reemplaza handleTrazabilitySubmit)
  // ----------------------------------------------------
  const handleTrazabilitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trazabilityCode) return;
    
    // Al iniciar una nueva búsqueda, reiniciamos la fase 2.
    setVerificationStarted(false); 
    setSubmitError(null);

    fetchData(trazabilityCode); // Llama al hook para hacer los GETs
  }

  const handleDestinySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    if (!destinyItemNo || !destinyInventoryLot || !destinyShippingUnitId) {
      setSubmitError("Complete ItemNo, InventoryLot y ShippingUnitId para Destiny.")
      return
    }

    setSubmitSuccess(
      `Datos Destiny listos: ItemNo ${destinyItemNo}, InventoryLot ${destinyInventoryLot}, ShippingUnitId ${destinyShippingUnitId}. Conectar con API Destiny.`,
    )
  }

  const handleQualitySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    if (!qualityPO2 || !qualityItemNumber) {
      setSubmitError("Complete PO2 e Item Number para Quality.")
      return
    }

    setSubmitSuccess(
      `Datos Quality listos: PO2 ${qualityPO2}, Item Number ${qualityItemNumber}. Conectar con API Quality.`,
    )
  }


  // ----------------------------------------------------
  // 2. FUNCIÓN POST DE INICIO DE VERIFICACIÓN (FASE 2)
  // ----------------------------------------------------
  const handleStartVerificationSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!consolidatedData) return; // Seguridad
      
      // Validar Inputs Manuales
      if (!clienteInput || !tipoBolsaInput || Number(piezasPorWicketInput) <= 0) {
          setSubmitError("Por favor, complete todos los campos manuales requeridos.");
          return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      const { etiqueta, orden, valoresTecnicos } = consolidatedData;
      const piezasPorCaja = Number((etiqueta as any).valor) || valoresTecnicos.piezasPorCaja;

      // --- CONSTRUCCIÓN DEL BODY DEL POST ---
      const postBody = {
          productoId: etiqueta.id,
          lote: String(etiqueta.orden), 
          cliente: clienteInput, 
          validadores: user?.name || "USUARIO DESCONOCIDO", 
          printCard: etiqueta.printCard || "",
          cantidadOrden: orden.cantidad,
          unidadOrden: orden.claveUnidad,
          piezasPorCaja: piezasPorCaja, 
          cajasPorTarima: valoresTecnicos.cajasXtarima,
          tipoBolsa: tipoBolsaInput, 
          wicketsPorCaja: valoresTecnicos.wicketPorCaja,
          piezasPorWicket: Number(piezasPorWicketInput), 
          perforaciones: String(valoresTecnicos.cantPerforaciones),
      };

      try {
          const urlPost = `http://172.16.10.31/api/Verificacion/iniciar`;
          const response = await fetch(urlPost, {
              method: 'POST',
              headers: {
                  'accept': '*/*',
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(postBody),
          });

          if (response.ok) {
              const result = await response.json(); 
              setSubmitSuccess(`Verificación ${result.id} iniciada. Redirigiendo...`);
              // Aquí debe ir la redirección al siguiente paso (puntos de control)
              // setTimeout(() => router.push(`/verificacion/${result.id}`), 1500); 

          } else {
              const errorData = await response.json();
              throw new Error(errorData.detail || "Error al iniciar la verificación en el servidor.");
          }
      } catch (err: any) {
          setSubmitError(err.message || "Error de conexión desconocido.");
      } finally {
          setIsSubmitting(false);
      }
  };


  // ----------------------------------------------------
  // --- RENDERING CONDICIONAL ---
  // ----------------------------------------------------

  // Si hay un éxito de POST, muestra la pantalla final
  if (submitSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="border-0 shadow-xl bg-card max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">Verificación Iniciada</h3>
            <p className="text-muted-foreground">{submitSuccess}</p>
            <Button className="mt-4" onClick={() => router.push("/dashboard/pendientes")}>
                Ir a Pendientes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- FASE 2: Inputs Manuales y POST (Si ya hay datos y el usuario inició) ---
  if (mode === "bioflex" && isDataAvailable && consolidatedData && verificationStarted) {
    const { etiqueta } = consolidatedData;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h3 className="text-2xl font-bold text-primary">Detalles de Inicio</h3>
            <p className="text-muted-foreground">Complete los campos manuales para iniciar formalmente la verificación de **{etiqueta.nombreProducto}**.</p>
            
            {(submitError || fetchError) && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {submitError || fetchError}
              </div>
            )}

            <form onSubmit={handleStartVerificationSubmit} className="space-y-6">
                
                {/* Campo 1: Cliente (Manual, Combobox) */}
                <div className="space-y-2">
                    <Label htmlFor="cliente">Cliente *</Label>
                    <Input 
                        id="cliente"
                        placeholder="Ingrese o seleccione el Cliente" 
                        value={clienteInput}
                        onChange={(e) => setClienteInput(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>
                
                {/* Campo 2: Tipo de Bolsa (Manual, Combobox) */}
                <div className="space-y-2">
                    <Label htmlFor="tipoBolsa">Tipo de Bolsa *</Label>
                    <Input 
                        id="tipoBolsa"
                        placeholder="Ingrese o seleccione el Tipo de Bolsa" 
                        value={tipoBolsaInput}
                        onChange={(e) => setTipoBolsaInput(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Campo 3: Piezas por Wicket (Manual) */}
                <div className="space-y-2">
                    <Label htmlFor="piezasPorWicket">Piezas por Wicket *</Label>
                    <Input 
                        id="piezasPorWicket"
                        type="number" 
                        placeholder="Ingrese el número de piezas" 
                        value={piezasPorWicketInput}
                        onChange={(e) => setPiezasPorWicketInput(e.target.value)}
                        disabled={isSubmitting}
                        min="1"
                    />
                </div>
                
                <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
                    {isSubmitting ? "Iniciando..." : "Confirmar e Iniciar Verificación"}
                </Button>
                <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setVerificationStarted(false)}
                    disabled={isSubmitting}
                >
                    Volver a Datos de Trazabilidad
                </Button>
            </form>
        </div>
    );
  }


  // --- FASE 1: Display de Datos (Si hay datos pero no ha iniciado la verificación) ---
  if (mode === "bioflex" && isDataAvailable && consolidatedData && !verificationStarted) {
    const { etiqueta, orden, valoresTecnicos } = consolidatedData;
    const piezasPorCajaDisplay = Number((etiqueta as any).valor) || valoresTecnicos.piezasPorCaja;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header con botón de retroceso */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => { setTrazabilityCode(''); fetchData('') }} disabled={isFetching || isSubmitting}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Datos Obtenidos</h2>
            <p className="text-muted-foreground">Confirme la información para iniciar la verificación.</p>
          </div>
        </div>

        {/* Tarjeta de Datos */}
        <Card className="border-0 shadow-lg bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle className="text-2xl text-primary">{etiqueta.nombreProducto}</CardTitle>
                <div className="text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
                    {etiqueta.claveProducto}
                </div>
            </div>
            <CardDescription className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Trazabilidad Escaneada: **{etiqueta.trazabilidad}**
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <Label className="text-muted-foreground text-xs uppercase">Área</Label>
                <p className="font-semibold text-lg">{etiqueta.area}</p>
            </div>
            <div className="space-y-1">
                <Label className="text-muted-foreground text-xs uppercase">Orden (Lote)</Label>
                <p className="font-semibold text-lg">{etiqueta.orden}</p>
            </div>
            <div className="col-span-2 space-y-1 bg-primary/10 p-3 rounded-lg">
                <Label className="text-primary text-xs uppercase">Unidad a Verificar</Label>
                <p className="font-bold text-xl">
                    {etiqueta.uom}
                </p>
                <p className="text-sm text-primary/70">
                    Cantidad Ordenada: **{orden.cantidad} {orden.unidad}**
                </p>
            </div>
            <div className="space-y-1">
                <Label className="text-muted-foreground text-xs uppercase">Print Card</Label>
                <p className="font-semibold">{etiqueta.printCard || "N/A"}</p>
            </div>
            <div className="space-y-1">
                <Label className="text-muted-foreground text-xs uppercase">Máquina</Label>
                <p className="font-semibold">{etiqueta.maquina}</p>
            </div>
            <div className="space-y-1">
                <Label className="text-muted-foreground text-xs uppercase">Piezas por Caja</Label>
                <p className="font-semibold">{piezasPorCajaDisplay}</p>
            </div>
          </CardContent>
        </Card>

        {/* Botón para Iniciar Verificación */}
        <div className="pt-4">
          <Button 
            onClick={() => setVerificationStarted(true)} 
            className="w-full h-12 text-lg"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Iniciar Verificación
          </Button>
        </div>
      </div>
    );
  }

  // --- FLUJOS DESTINY Y QUALITY ---
  if (mode === "destiny") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setMode("bioflex")
              setSubmitError(null)
              setSubmitSuccess(null)
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Destiny</h2>
            <p className="text-muted-foreground">Ingrese los datos requeridos para iniciar una verificación Destiny.</p>
          </div>
        </div>

        {(submitError || fetchError) && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {submitError || fetchError}
          </div>
        )}

        <Card className="border-0 shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="text-xl text-card-foreground">Datos Destiny</CardTitle>
            <CardDescription>ItemNo, InventoryLot y ShippingUnitId</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDestinySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="destiny-item">ItemNo</Label>
                <Input
                  id="destiny-item"
                  value={destinyItemNo}
                  onChange={(e) => setDestinyItemNo(e.target.value)}
                  placeholder="Ej. DST-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destiny-lot">InventoryLot</Label>
                <Input
                  id="destiny-lot"
                  value={destinyInventoryLot}
                  onChange={(e) => setDestinyInventoryLot(e.target.value)}
                  placeholder="Ej. LOT-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destiny-shipping">ShippingUnitId</Label>
                <Input
                  id="destiny-shipping"
                  value={destinyShippingUnitId}
                  onChange={(e) => setDestinyShippingUnitId(e.target.value)}
                  placeholder="Ej. SHP-123"
                />
              </div>
              <Button type="submit" className="w-full h-12 text-lg">
                Buscar datos Destiny
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (mode === "quality") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setMode("bioflex")
              setSubmitError(null)
              setSubmitSuccess(null)
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Quality</h2>
            <p className="text-muted-foreground">Ingrese los datos requeridos para iniciar una verificación Quality.</p>
          </div>
        </div>

        {(submitError || fetchError) && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {submitError || fetchError}
          </div>
        )}

        <Card className="border-0 shadow-lg bg-card">
          <CardHeader>
            <CardTitle className="text-xl text-card-foreground">Datos Quality</CardTitle>
            <CardDescription>PO2 e Item Number</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleQualitySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quality-po2">PO2</Label>
                <Input
                  id="quality-po2"
                  value={qualityPO2}
                  onChange={(e) => setQualityPO2(e.target.value)}
                  placeholder="Ej. PO-12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quality-item">Item Number</Label>
                <Input
                  id="quality-item"
                  value={qualityItemNumber}
                  onChange={(e) => setQualityItemNumber(e.target.value)}
                  placeholder="Ej. ITM-789"
                />
              </div>
              <Button type="submit" className="w-full h-12 text-lg">
                Buscar datos Quality
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }


  // --- FASE 0: Vista Inicial con selector ---
  const currentMode = mode as "bioflex" | "destiny" | "quality";
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Iniciar Nueva Verificación</h2>
          <p className="text-muted-foreground">Elija el flujo y capture los datos requeridos.</p>
        </div>
      </div>

      <Card className="border-0 shadow-md bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Grid className="w-4 h-4" />
            Seleccione el tipo de verificación
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              type="button"
              variant={currentMode === "bioflex" ? "default" : "outline"}
              onClick={() => {
                setMode("bioflex")
                setSubmitSuccess(null)
                setSubmitError(null)
                setVerificationStarted(false)
                setTrazabilityCode("")
              }}
              className="w-full"
            >
              Bioflex
            </Button>
            <Button
              type="button"
              variant={currentMode === "destiny" ? "default" : "outline"}
              onClick={() => {
                setMode("destiny")
                setSubmitSuccess(null)
                setSubmitError(null)
                setVerificationStarted(false)
              }}
              className="w-full"
            >
              Destiny
            </Button>
            <Button
              type="button"
              variant={currentMode === "quality" ? "default" : "outline"}
              onClick={() => {
                setMode("quality")
                setSubmitSuccess(null)
                setSubmitError(null)
                setVerificationStarted(false)
              }}
              className="w-full"
            >
              Quality
            </Button>
          </div>
        </CardContent>
      </Card>

      {(fetchError || submitError) && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {fetchError || submitError}
        </div>
      )}

      {mode === "bioflex" && (
        <Card className="border-0 shadow-xl bg-card">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <QrCode className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl text-card-foreground">Bioflex</CardTitle>
            <CardDescription>Ingresa el código o escanea el QR.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrazabilitySubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="trazabilityCode" className="text-card-foreground">
                  Código de Trazabilidad
                </Label>
                <div className="relative">
                  <Input
                    id="trazabilityCode"
                    placeholder="Ej: 604025132030"
                    value={trazabilityCode}
                    onChange={(e) => setTrazabilityCode(e.target.value)}
                    className="pl-4 h-12 text-lg text-center font-mono"
                    disabled={isFetching}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-lg" disabled={isFetching || !trazabilityCode}>
                {isFetching ? (
                  "Buscando Datos..."
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Buscar y Continuar
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
