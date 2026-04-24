"use client"

import { useState } from "react"
import { LockKeyhole, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"

export function ForcePasswordUpdateModal() {
  const { mustChangePassword, updatePassword } = useAuth()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    const trimmedPassword = newPassword.trim()
    const trimmedConfirmation = confirmPassword.trim()

    if (trimmedPassword.length < 4) {
      setError("La nueva contraseña debe tener al menos 4 caracteres.")
      return
    }

    if (trimmedPassword !== trimmedConfirmation) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setIsSaving(true)

    const success = await updatePassword(trimmedPassword)

    if (!success) {
      setError("No se pudo actualizar la contraseña. Intente nuevamente.")
    } else {
      setNewPassword("")
      setConfirmPassword("")
    }

    setIsSaving(false)
  }

  return (
    <Dialog open={mustChangePassword}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <LockKeyhole className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <DialogTitle>Actualiza tu contraseña</DialogTitle>
            <DialogDescription className="text-base leading-6">
              Estás entrando con tu clave inicial. Antes de continuar debes registrar una nueva contraseña.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium text-foreground">
              Nueva contraseña
            </label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
              Confirmar contraseña
            </label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <DialogFooter>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Guardar contraseña"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
