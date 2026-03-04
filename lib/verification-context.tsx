"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { classifyApiError } from "@/lib/api-error"

// =========================================================================
// INTERFACES GLOBALES (Mantenerlas en un archivo separado como verification-types.ts es mejor)
// =========================================================================

// Interfaz de tu UI (Se mantiene igual)
export interface Verification {
  id: string
  productName: string
  lotNumber: string
  expirationDate: string
  status: "pending" | "in-progress" | "completed" | "rejected"
  createdAt: string
  updatedAt: string
  inspector: string
  cliente: string
  notas?: string
  notes?: string
  checkpoints: {
    packaging: boolean | null
    labeling: boolean | null
    sealing: boolean | null
    documentation: boolean | null
  }
}

// Interfaz de la respuesta de la API /api/Verificacion/activas
interface ActiveVerificationData {
  id: number;
  lote: string; 
  producto: string; 
  cliente: string;
  fechaInicio: string;
  avanceTarimas: number;
}

// =========================================================================
// CONTEXTO Y PROVIDER
// =========================================================================

interface VerificationContextType {
  verifications: Verification[]
  isLoading: boolean
  error: string | null
  fetchVerifications: () => Promise<void>
  addVerification: (verification: Omit<Verification, "id" | "createdAt" | "updatedAt">) => Promise<boolean>
  updateVerification: (id: string, updates: Partial<Verification>) => Promise<boolean>
  getVerificationById: (id: string) => Verification | undefined
  getPendingVerifications: () => Verification[]
}

const VerificationContext = createContext<VerificationContextType | undefined>(undefined)

// Usaremos la URL dura para asegurar la conexión inmediata
const API_VERIFICATION_URL = "http://172.16.10.31/api/Verificacion";

export function VerificationProvider({ children }: { children: ReactNode }) {
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVerifications = async () => {
    setIsLoading(true)
    setError(null)
    try {
        // --- 1. GET al endpoint de verificaciones activas ---
        let activeResponse: Response;
        try {
            activeResponse = await fetch(`${API_VERIFICATION_URL}/activas`);
        } catch (err) {
            const classified = classifyApiError(err);
            throw new Error(`${classified.message} ${classified.hint}`);
        }

        if (!activeResponse.ok) {
            const classified = classifyApiError(new Error(`HTTP ${activeResponse.status}`), activeResponse.status);
            throw new Error(`${classified.message} ${classified.hint}`);
        }

        const activeData: ActiveVerificationData[] = await activeResponse.json();

        // --- 2. MAPEO: Convertir el formato de la API a tu formato Verification ---
        const mappedVerifications: Verification[] = activeData.map((apiVer) => {
            
            // Lógica para determinar el estado:
            const status: "pending" | "in-progress" = 
                apiVer.avanceTarimas > 0 ? "in-progress" : "pending";

            return {
                id: String(apiVer.id),
                productName: `${apiVer.producto} — Lote ${apiVer.lote}`,
                lotNumber: apiVer.lote,
                expirationDate: apiVer.fechaInicio,
                status: status,
                createdAt: apiVer.fechaInicio,
                updatedAt: new Date().toISOString(),
                inspector: "",
                cliente: apiVer.cliente,
                notes: `Tarimas avanzadas: ${apiVer.avanceTarimas}`,
                checkpoints: {
                    packaging: null,
                    labeling: null,
                    sealing: null,
                    documentation: null,
                },
            } as Verification;
        });

        setVerifications(mappedVerifications);

    } catch (err) {
        console.error("Error en fetchVerifications:", err);
        setError(err instanceof Error ? err.message : "Error inesperado. Intente nuevamente.");
        setVerifications([]);
    } finally {
      setIsLoading(false)
    }
  }

  // Las funciones addVerification y updateVerification se dejan con TODO, 
  // ya que la lógica POST se maneja directamente en los componentes de formulario y modal.
  const addVerification = async (
    verification: Omit<Verification, "id" | "createdAt" | "updatedAt">,
  ): Promise<boolean> => {
    console.log("TODO: addVerification. El POST de inicio de verificación se maneja en NewVerificationForm.")
    return false
  }

  const updateVerification = async (id: string, updates: Partial<Verification>): Promise<boolean> => {
    console.log("TODO: updateVerification. El POST de escaneo se maneja en VerificationScanModal.")
    return false
  }

  const getVerificationById = (id: string) => {
    return verifications.find((v) => v.id === id)
  }

  const getPendingVerifications = () => {
    return verifications.filter((v) => v.status === "pending" || v.status === "in-progress")
  }

  return (
    <VerificationContext.Provider
      value={{
        verifications,
        isLoading,
        error,
        fetchVerifications,
        addVerification,
        updateVerification,
        getVerificationById,
        getPendingVerifications,
      }}
    >
      {children}
    </VerificationContext.Provider>
  )
}

export function useVerifications() {
  const context = useContext(VerificationContext)
  if (context === undefined) {
    throw new Error("useVerifications must be used within a VerificationProvider")
  }
  return context
}