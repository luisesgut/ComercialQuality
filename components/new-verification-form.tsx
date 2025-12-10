"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

// Hooks personalizados
import { useAuth } from "@/lib/auth-context" 
import { useVerificationData } from "@/hooks/useVerificationData" 

// Tipos
import { ConsolidateProductData, DestinyEtiquetaData } from "@/app/types/verification-types" 

// Componentes de UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Iconos
import { ArrowLeft, CheckCircle, AlertCircle, Search, QrCode, Grid, Hash } from "lucide-react"

// URL Base de la API
const API_BASE_URL = "http://172.16.10.31/api";

export function NewVerificationForm() {
  const router = useRouter()
  const { user } = useAuth() 

  // --- USO DEL HOOK UNIFICADO ---
  const { 
      consolidatedData, 
      isFetching, 
      error: fetchError, 
      fetchByBioflex,
      fetchByDestiny,
      resetData,
  } = useVerificationData();
  
  // --- ESTADOS LOCALES DE FLUJO ---
  const [trazabilityCode, setTrazabilityCode] = useState("")
  const [verificationStarted, setVerificationStarted] = useState(false); // FASE 2: Inputs Manuales
  const [mode, setMode] = useState<"bioflex" | "destiny" | "quality">("bioflex")
  const [isScannerActive, setIsScannerActive] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerStreamRef = useRef<MediaStream | null>(null)
  const [isVideoReady, setIsVideoReady] = useState(false) // Nuevo estado

  
  // El estado de disponibilidad depende del objeto consolidado (sirve para ambos modos)
  const isDataAvailable = !!consolidatedData && !fetchError;

  // --- ESTADOS DE LA FASE 2 (Inputs Manuales y POST) ---
  const [clienteInput, setClienteInput] = useState<string>('');
  const [tipoBolsaInput, setTipoBolsaInput] = useState<string>('');
  const [piezasPorWicketInput, setPiezasPorWicketInput] = useState<number | string>(''); 
  const [isSubmitting, setIsSubmitting] = useState(false) 
  const [submitError, setSubmitError] = useState<string | null>(null) 
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null) 
  const [createdVerificationId, setCreatedVerificationId] = useState<number | null>(null)
  const REDIRECT_DELAY_MS = 600
  
  // --- ESTADOS ESPECÍFICOS DE DESTINY (Inputs) ---
  const [destinyItemNo, setDestinyItemNo] = useState("")
  const [destinyInventoryLot, setDestinyInventoryLot] = useState("")
  const [destinyShippingUnitId, setDestinyShippingUnitId] = useState("")
  
  // --- ESTADOS ESPECÍFICOS DE QUALITY (Mock) ---
  const [qualityPO2, setQualityPO2] = useState("")
  const [qualityItemNumber, setQualityItemNumber] = useState("")
  const scanLoopRef = useRef<number | null>(null)

  
  // ----------------------------------------------------
  // 1. HANDLERS DE BÚSQUEDA (GET)
  // ----------------------------------------------------
  
  // Bioflex
  const handleTrazabilitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trazabilityCode) return;
    setVerificationStarted(false); 
    setSubmitError(null);
    fetchByBioflex(trazabilityCode);
  }

  // Destiny
  const handleDestinySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setVerificationStarted(false);

    if (!destinyItemNo || !destinyInventoryLot || !destinyShippingUnitId) {
      setSubmitError("Complete ItemNo, InventoryLot y ShippingUnitId para Destiny.")
      return
    }

    // Usamos el hook unificado
    await fetchByDestiny(destinyItemNo, destinyInventoryLot, destinyShippingUnitId);
  }

  // Quality (Mock)
  const handleQualitySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(
      `Funcionalidad en desarrollo. Pronto se conectará el flujo de Quality (PO2 ${qualityPO2}, Item Number ${qualityItemNumber}).`,
    )
  }

  // ----------------------------------------------------
  // Escáner QR simple usando BarcodeDetector (si está disponible)
  // ----------------------------------------------------
   const stopScanner = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current)
      scanLoopRef.current = null
    }
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((t) => t.stop())
      scannerStreamRef.current = null
    }
    setIsScannerActive(false)
    setIsVideoReady(false)
  }

const startScanner = async () => {
    setScannerError(null)
    setIsVideoReady(false)
    
    // Verificación de soporte
    const BarcodeDetectorRef: any = (window as any).BarcodeDetector
    if (!BarcodeDetectorRef) {
      setScannerError("Tu navegador no soporta la detección de códigos nativa. Usa Chrome en Android/Desktop.")
      return
    }

    try {
      // 1. Obtener el stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      
      // 2. Guardar el stream en la referencia
      scannerStreamRef.current = stream
      
      // 3. Activar el estado (esto provocará que aparezca el <video> en el DOM)
      setIsScannerActive(true)

    } catch (err: any) {
      console.error("Error iniciando scanner:", err)
      setScannerError(err?.message || "No se pudo acceder a la cámara.")
      stopScanner()
    }
  }

  // Efecto para conectar el stream al video cuando el componente se renderiza
  useEffect(() => {
    // Si no está activo o no hay stream o no hay elemento de video, no hacemos nada
    if (!isScannerActive || !scannerStreamRef.current || !videoRef.current) return;

    const video = videoRef.current;
    const stream = scannerStreamRef.current;
    video.srcObject = stream;

    // Lógica de reproducción y detección
    const BarcodeDetectorRef: any = (window as any).BarcodeDetector;
    const detector = new BarcodeDetectorRef({ formats: ["qr_code"] });

    const onCanPlay = async () => {
        try {
            await video.play();
            setIsVideoReady(true);
            
            // Iniciar loop de detección
            const scanLoop = async () => {
                // Verificamos que el scanner siga activo
                if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

                try {
                    const barcodes = await detector.detect(video);
                    if (barcodes.length > 0) {
                        const qr = barcodes[0].rawValue;
                        console.log("QR detectado:", qr);
                        setTrazabilityCode(qr);
                        stopScanner(); // Detenemos al encontrar uno
                        return;
                    }
                } catch (err) {
                    // Errores de detección puntuales se ignoran para no saturar
                }
                
                // Siguiente frame
                scanLoopRef.current = requestAnimationFrame(scanLoop);
            };

            scanLoopRef.current = requestAnimationFrame(scanLoop);

        } catch (err) {
            console.error("Error al reproducir video:", err);
        }
    };

    video.addEventListener("canplay", onCanPlay, { once: true });

    // Cleanup local del efecto (por si el usuario desmonta rápido)
    return () => {
        video.removeEventListener("canplay", onCanPlay);
        if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };

  }, [isScannerActive]); // Dependencia: se ejecuta cuando activas el scanner
  useEffect(() => {
    return () => stopScanner()
  }, [])


  // ----------------------------------------------------
  // 2. FUNCIÓN POST DE INICIO DE VERIFICACIÓN (FASE 2)
  // ----------------------------------------------------
  const handleStartVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!consolidatedData) return;

    // Extraemos datos del hook (ahora sirve para ambos modos)
    const { etiqueta, orden, valoresTecnicos } = consolidatedData;

    let postDataSpecific: any = {};
    
    // Lógica de Negocio Diferenciada
    if (mode === "bioflex") {
        // Lógica de Bioflex: x10
        const piezasPorCajaBioflex = (valoresTecnicos?.piezasPorCaja || 0) * 10; 
        
        postDataSpecific = {
            cantidadOrden: orden?.cantidad,
            unidadOrden: orden?.unidad, // "Millares"
            piezasPorCaja: piezasPorCajaBioflex, 
            cajasPorTarima: valoresTecnicos?.cajasXtarima,
            wicketsPorCaja: valoresTecnicos?.wicketPorCaja,
            perforaciones: String(valoresTecnicos?.cantPerforaciones || ""),
        };

    } else if (mode === "destiny") {
        // Para Destiny:
        // - productoId: etiqueta.id (4389)
        // - lote: etiqueta.orden (28596)
        // - printCard: etiqueta.printCard ("E-4814-A_R-1")
        // - cantidadOrden: orden.cantidad (500)
        // - unidadOrden: orden.unidad ("Millares")
        // - piezasPorCaja: etiqueta.prodEtiquetasDestiny.qtyUOM (1000)
        // - cajasPorTarima: valoresTecnicos.cajasXtarima (30)
        // - wicketsPorCaja: valoresTecnicos.wicketPorCaja (6)
        // - perforaciones: valoresTecnicos.cantPerforaciones (4)
        
        const destLabel = etiqueta as unknown as DestinyEtiquetaData;
        const piezasPorCajaDestiny = Number(destLabel.prodEtiquetasDestiny?.qtyUOM || 0);
        
        postDataSpecific = {
            cantidadOrden: orden?.cantidad, // 500
            unidadOrden: orden?.unidad, // "Millares"
            piezasPorCaja: piezasPorCajaDestiny, // 1000
            cajasPorTarima: valoresTecnicos?.cajasXtarima || 0, // 30
            wicketsPorCaja: valoresTecnicos?.wicketPorCaja || 0, // 6
            perforaciones: String(valoresTecnicos?.cantPerforaciones || ""), // "4"
        };
    }
    
    // 2. Validar Inputs Manuales (compartidos)
    if (!clienteInput || !tipoBolsaInput || Number(piezasPorWicketInput) <= 0) {
        setSubmitError("Por favor, complete todos los campos manuales requeridos.");
        return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    // --- 3. CONSTRUCCIÓN DEL BODY FINAL ---
    const finalPostBody = {
        productoId: etiqueta.id || 0, // ID de la etiqueta (4389 para Destiny)
        lote: String(etiqueta.orden), // El lote es el campo "orden" (28596 para Destiny)
        cliente: clienteInput, 
        validadores: user?.name || "USUARIO DESCONOCIDO", 
        printCard: etiqueta.printCard || "", // "E-4814-A_R-1"
        tipoBolsa: tipoBolsaInput, 
        piezasPorWicket: Number(piezasPorWicketInput), 
        ...postDataSpecific 
    };

    try {
        const urlPost = `${API_BASE_URL}/Verificacion/iniciar`;
        const response = await fetch(urlPost, {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(finalPostBody),
        });

        if (response.ok) {
            const result = await response.json(); 
            setSubmitSuccess(`Verificación ${result.id} iniciada. Redirigiendo...`);
            setCreatedVerificationId(result.id);
            setTimeout(() => router.push(`/dashboard/verificacion/${result.id}`), REDIRECT_DELAY_MS);

        } else {
            let detail = "Error al iniciar la verificación en el servidor.";
            try {
              const errorData = await response.json();
              detail = errorData.detail || detail;
            } catch {
              // ignore parse error
            }
            throw new Error(detail);
        }
    } catch (err: any) {
        setSubmitError(err.message || "Error de conexión desconocido.");
    } finally {
        setIsSubmitting(false);
    }
};

  // ----------------------------------------------------
  // --- RENDERING CONDICIONAL (UI) ---
  // ----------------------------------------------------

  // Si hay un éxito de POST, muestra la pantalla final
  if (submitSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-lg w-full border-0 shadow-lg bg-card text-center space-y-4 p-6">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">¡Verificación creada!</CardTitle>
            <CardDescription>{submitSuccess}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              onClick={() => {
                if (createdVerificationId) {
                  router.push(`/dashboard/verificacion/${createdVerificationId}`);
                } else {
                  router.push("/dashboard/pendientes");
                }
              }}
            >
              Ir al detalle
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/pendientes")}>
              Ver pendientes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- FASE 2: Inputs Manuales y POST (Compartida) ---
  // Usamos consolidatedData para ambos modos
  if (isDataAvailable && consolidatedData && verificationStarted) {
    const { etiqueta, valoresTecnicos } = consolidatedData;
    
    // Calcular sugerencia de piezas por wicket para Destiny
    let piezasPorWicketSuggestion = "";
    if (mode === "destiny" && valoresTecnicos) {
        const destLabel = etiqueta as unknown as DestinyEtiquetaData;
        const qtyUOM = Number(destLabel.prodEtiquetasDestiny?.qtyUOM || 0);
        const wicketPorCaja = valoresTecnicos.wicketPorCaja || 1;
        
        if (qtyUOM > 0 && wicketPorCaja > 0) {
            const calculado = qtyUOM / wicketPorCaja;
            piezasPorWicketSuggestion = ` (Sugerido: ${calculado.toFixed(2)})`;
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h3 className="text-2xl font-bold text-primary">Detalles de Inicio ({mode.toUpperCase()})</h3>
            <p className="text-muted-foreground">Complete los campos manuales para iniciar formalmente la verificación de **{etiqueta.nombreProducto}**.</p>
            
            {(submitError || fetchError) && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {submitError || fetchError}
              </div>
            )}

            <form onSubmit={handleStartVerificationSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="cliente">Cliente *</Label>
                    <Input id="cliente" placeholder="Ingrese o seleccione el Cliente" value={clienteInput}
                        onChange={(e) => setClienteInput(e.target.value)} disabled={isSubmitting}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tipoBolsa">Tipo de Bolsa *</Label>
                    <Input id="tipoBolsa" placeholder="Ingrese o seleccione el Tipo de Bolsa" value={tipoBolsaInput}
                        onChange={(e) => setTipoBolsaInput(e.target.value)} disabled={isSubmitting}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="piezasPorWicket">Piezas por Wicket *{piezasPorWicketSuggestion}</Label>
                    <Input id="piezasPorWicket" type="number" placeholder="Ingrese el número de piezas" value={piezasPorWicketInput}
                        onChange={(e) => setPiezasPorWicketInput(e.target.value)} disabled={isSubmitting} min="1" step="0.01"/>
                </div>
                
                <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
                    {isSubmitting ? "Iniciando..." : "Confirmar e Iniciar Verificación"}
                </Button>
                <Button 
                    type="button" variant="outline" className="w-full" onClick={() => setVerificationStarted(false)}
                    disabled={isSubmitting}>
                    Volver a Datos de {mode === "bioflex" ? "Trazabilidad" : "Destiny"}
                </Button>
            </form>
        </div>
    );
  }


  // --- FASE 1: Display de Datos (Bioflex o Destiny) ---
  if (isDataAvailable && consolidatedData && !verificationStarted) {
    
    const isBioflex = mode === "bioflex";
    const { etiqueta, orden, valoresTecnicos } = consolidatedData;
    
    // Type guard para detectar si la etiqueta tiene la forma DestinyEtiquetaData
    const isDestinyEtiqueta = (e: any): e is DestinyEtiquetaData => {
      return !!e && typeof e === "object" && ("prodEtiquetasDestiny" in e || "piezas" in e || "claveUnidad" in e);
    };

    // Display values (Calculados según modo para la vista previa)
    const piezasPorCajaDisplay = isBioflex
        ? ((etiqueta as any).valor || valoresTecnicos?.piezasPorCaja)
        : (isDestinyEtiqueta(etiqueta) ? (etiqueta.prodEtiquetasDestiny?.qtyUOM ?? "-") : "-");
    
    const qtyOrden = isBioflex
        ? `${orden?.cantidad || '-'} ${orden?.unidad || '-'}`
        : `${orden?.cantidad || '-'} ${orden?.unidad || '-'}`;

    const secondaryHeader = isBioflex
      ? `Trazabilidad: ${(etiqueta as any).trazabilidad}`
      : `Shipping ID: ${etiqueta.orden}`;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={resetData} disabled={isFetching || isSubmitting}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Datos Obtenidos ({mode.toUpperCase()})</h2>
            <p className="text-muted-foreground">Confirme la información para iniciar la verificación.</p>
          </div>
        </div>

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
                {secondaryHeader}
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
                <Label className="text-primary text-xs uppercase">Cantidad Ordenada</Label>
                <p className="font-bold text-xl">{qtyOrden}</p>
            </div>
            <div className="space-y-1">
                <Label className="text-muted-foreground text-xs uppercase">Print Card</Label>
                <p className="font-semibold">{etiqueta.printCard || "N/A"}</p>
            </div>
          
            <div className="space-y-1">
                <Label className="text-muted-foreground text-xs uppercase">Piezas por Caja (QtyUOM)</Label>
                <p className="font-semibold">{piezasPorCajaDisplay}</p>
            </div>
          </CardContent>
        </Card>

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

  // --- FLUJOS DESTINY Y QUALITY (Inputs de Búsqueda) ---
  if (mode === "destiny") {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
            <Button
                variant="ghost" size="icon" onClick={() => setMode("bioflex")}
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
                    <Input id="destiny-item" value={destinyItemNo} onChange={(e) => setDestinyItemNo(e.target.value)} placeholder="Ej. 61953-11" disabled={isFetching} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="destiny-lot">InventoryLot</Label>
                    <Input id="destiny-lot" value={destinyInventoryLot} onChange={(e) => setDestinyInventoryLot(e.target.value)} placeholder="Ej. 13915" disabled={isFetching} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="destiny-shipping">ShippingUnitId</Label>
                    <Input id="destiny-shipping" value={destinyShippingUnitId} onChange={(e) => setDestinyShippingUnitId(e.target.value)} placeholder="Ej. 28596" disabled={isFetching} />
                </div>
                <Button type="submit" className="w-full h-12 text-lg" disabled={isFetching}>
                    {isFetching ? "Buscando..." : "Buscar datos Destiny"}
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
                variant="ghost" size="icon" onClick={() => setMode("bioflex")}
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
                <CardDescription>Funcionalidad en desarrollo. El ingreso de datos está deshabilitado.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                  <fieldset disabled className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="quality-po2">PO2</Label>
                      <Input id="quality-po2" value={qualityPO2} placeholder="Próximamente" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quality-item">Item Number</Label>
                      <Input id="quality-item" value={qualityItemNumber} placeholder="Próximamente" />
                    </div>
                    <Button type="button" className="w-full h-12 text-lg">
                      Próximamente disponible
                    </Button>
                  </fieldset>
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
                setCreatedVerificationId(null)
                setSubmitError(null)
                setVerificationStarted(false)
                setTrazabilityCode("")
                stopScanner()
                resetData(); // Limpia datos al cambiar
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
                setCreatedVerificationId(null)
                setSubmitError(null)
                setVerificationStarted(false)
                stopScanner()
                resetData(); // Limpia datos al cambiar
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
                setCreatedVerificationId(null)
                setSubmitError(null)
                setVerificationStarted(false)
                stopScanner()
                resetData();
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

     {mode === "bioflex" && !isDataAvailable && (
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
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (isScannerActive) {
                        stopScanner()
                      } else {
                        startScanner()
                      }
                    }}
                    disabled={isFetching}
                  >
                    <QrCode className="w-5 h-5 mr-2" />
                    {isScannerActive ? "Detener escaneo" : "Escanear QR con cámara"}
                  </Button>
                  {scannerError && (
                    <p className="text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {scannerError}
                    </p>
                  )}
                  {isScannerActive && (
                    <div className="mt-2 rounded-lg border bg-black/70 p-2 flex flex-col items-center gap-2">
                      <video
                        ref={videoRef}
                        className="w-full rounded-md aspect-video object-cover"
                        autoPlay
                        playsInline
                        muted
                        style={{ backgroundColor: '#000' }}
                      />
                      <p className="text-xs text-muted-foreground">
                        {isVideoReady 
                          ? "Apunte al código QR para capturar la trazabilidad." 
                          : "Cargando cámara..."}
                      </p>
                    </div>
                  )}
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