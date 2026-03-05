"use client"

import { useState } from "react"

const API_BASE_URL = "http://172.16.10.31/api"

export interface TarimaCaja {
  detalleId: number
  identificador: string
  cantidad?: number
  piezasAuditadas?: number
  tieneDefectos?: boolean
  comentarios?: string | null
  horaEscaneo?: string
}

export interface TarimaDetalle {
  tarimaId: number
  numeroTarima: number
  verificacionId: number
  estado: "ABIERTA" | "CERRADA"
  puedeEditar: boolean
  cajasEscaneadas: number
  cajasMeta: number
  usuarioCreo: string
  fechaInicio: string
  fechaCierre: string | null
  cajas: TarimaCaja[]
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const text = await res.text()
    if (!text) return fallback
    try {
      const json = JSON.parse(text)
      return json.detail || json.message || json.error || text || fallback
    } catch {
      return text || fallback
    }
  } catch {
    return fallback
  }
}

export function useTarimaDetail() {
  const [tarima, setTarima] = useState<TarimaDetalle | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTarima = async (tarimaId: number) => {
    setIsLoading(true)
    setError(null)
    setTarima(null)
    try {
      const res = await fetch(`${API_BASE_URL}/Verificacion/tarima/${tarimaId}`)
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Error (${res.status}) al obtener tarima.`))
      }
      const data: TarimaDetalle = await res.json()
      setTarima(data)
    } catch (err: any) {
      setError(err.message || "Error de conexión.")
    } finally {
      setIsLoading(false)
    }
  }

  const reabrirTarima = async (tarimaId: number): Promise<boolean> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/Verificacion/reabrir-tarima/${tarimaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Error (${res.status}) al reabrir tarima.`))
      }
      await fetchTarima(tarimaId)
      return true
    } catch (err: any) {
      setError(err.message || "Error de conexión.")
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const eliminarCaja = async (detalleId: number, tarimaId: number): Promise<boolean> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/Verificacion/eliminar-caja/${detalleId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res, `Error (${res.status}) al eliminar caja.`))
      }
      await fetchTarima(tarimaId)
      return true
    } catch (err: any) {
      setError(err.message || "Error de conexión.")
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  return { tarima, isLoading, isSubmitting, error, fetchTarima, reabrirTarima, eliminarCaja }
}
