"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { Printer, X, User, Calendar, Target, Loader2 } from "lucide-react"
import type { TarimaDetalle } from "@/hooks/useTarimaDetail"

interface TarimaLabelModalProps {
  tarima: TarimaDetalle
  onClose: () => void
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

async function imprimirEtiqueta(tarima: TarimaDetalle) {
  const qrDataUrl = await QRCode.toDataURL(String(tarima.tarimaId), {
    width: 200,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  })

  const fecha = formatFecha(tarima.fechaInicio)
  const win = window.open("", "_blank", "width=480,height=520")
  if (!win) return

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Etiqueta Tarima #${tarima.numeroTarima}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 12px; background: #fff; }
    .label {
      border: 3px solid #000;
      border-radius: 8px;
      padding: 16px;
      max-width: 340px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .header-sub { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #444; }
    .tarima-num { font-size: 42px; font-weight: 900; letter-spacing: -1px; line-height: 1; }
    .body { display: flex; gap: 12px; align-items: flex-start; }
    .qr-block { flex-shrink: 0; }
    .qr-block img { display: block; width: 110px; height: 110px; }
    .qr-hint { font-size: 9px; text-align: center; color: #666; margin-top: 2px; }
    .info { flex: 1; }
    .id-value { font-size: 28px; font-weight: 900; letter-spacing: 2px; line-height: 1; }
    .id-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .rows { margin-top: 8px; }
    .row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      padding: 3px 0;
      border-bottom: 1px solid #eee;
    }
    .row-label { color: #666; }
    .row-value { font-weight: 600; }
    @media print {
      body { padding: 0; }
      @page { margin: 8mm; }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">
      <div class="header-sub">Etiqueta de Tarima</div>
      <div class="tarima-num">#${tarima.numeroTarima}</div>
    </div>
    <div class="body">
      <div class="qr-block">
        <img src="${qrDataUrl}" alt="QR Tarima ${tarima.tarimaId}" />
        <div class="qr-hint">ID: ${tarima.tarimaId}</div>
      </div>
      <div class="info">
        <div class="id-label">ID de Tarima</div>
        <div class="id-value">${tarima.tarimaId}</div>
        <div class="rows">
          <div class="row">
            <span class="row-label">Verificación</span>
            <span class="row-value">#${tarima.verificacionId}</span>
          </div>
          <div class="row">
            <span class="row-label">Meta</span>
            <span class="row-value">${tarima.cajasMeta} cj</span>
          </div>
          <div class="row">
            <span class="row-label">Operador</span>
            <span class="row-value" style="max-width:120px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${tarima.usuarioCreo}</span>
          </div>
          <div class="row">
            <span class="row-label">Inicio</span>
            <span class="row-value">${fecha}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>window.onload = () => { window.print() }</script>
</body>
</html>`)
  win.document.close()
}

export function TarimaLabelModal({ tarima, onClose }: TarimaLabelModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    QRCode.toDataURL(String(tarima.tarimaId), {
      width: 160,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl)
  }, [tarima.tarimaId])

  const handlePrint = async () => {
    setIsPrinting(true)
    await imprimirEtiqueta(tarima)
    setIsPrinting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm space-y-5 p-6">

        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold">Etiqueta lista para imprimir</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Label preview */}
        <div className="border-2 border-black rounded-xl overflow-hidden text-sm">

          {/* Tarima number */}
          <div className="text-center py-3 border-b border-black">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Etiqueta de Tarima</p>
            <p className="text-5xl font-black leading-none mt-1">#{tarima.numeroTarima}</p>
          </div>

          {/* QR + info */}
          <div className="flex gap-4 p-4">
            <div className="shrink-0 flex flex-col items-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR Tarima ${tarima.tarimaId}`} className="w-28 h-28" />
              ) : (
                <div className="w-28 h-28 flex items-center justify-center bg-muted rounded">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1 text-center">ID: {tarima.tarimaId}</p>
            </div>

            <div className="flex-1 space-y-1.5">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ID de Tarima</p>
                <p className="text-3xl font-black tracking-wider leading-none">{tarima.tarimaId}</p>
              </div>
              <div className="divide-y divide-border">
                <div className="flex justify-between py-1 text-xs">
                  <span className="text-muted-foreground">Verificación</span>
                  <span className="font-semibold">#{tarima.verificacionId}</span>
                </div>
                <div className="flex justify-between py-1 text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground"><Target className="w-3 h-3" />Meta</span>
                  <span className="font-semibold">{tarima.cajasMeta} cajas</span>
                </div>
                <div className="flex justify-between py-1 text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground"><User className="w-3 h-3" />Operador</span>
                  <span className="font-semibold truncate max-w-[100px] text-right">{tarima.usuarioCreo}</span>
                </div>
                <div className="flex justify-between py-1 text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground"><Calendar className="w-3 h-3" />Inicio</span>
                  <span className="font-semibold">{formatFecha(tarima.fechaInicio)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button className="flex-1 h-12 text-base font-semibold" onClick={handlePrint} disabled={isPrinting || !qrDataUrl}>
            {isPrinting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Abriendo...</>
              : <><Printer className="w-4 h-4 mr-2" />Imprimir etiqueta</>
            }
          </Button>
          <Button variant="outline" className="h-12 px-4" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
