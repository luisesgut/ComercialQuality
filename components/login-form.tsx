"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Shield, Lock, Loader2, Check, ChevronsUpDown, ArrowLeft } from "lucide-react"

export function LoginForm() {
  const [selectedUserId, setSelectedUserId] = useState("")
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUserOpen, setIsUserOpen] = useState(false)
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false)
  const { login, updatePassword, users, isUsersLoading } = useAuth()
  const router = useRouter()
  const selectedUser = users.find((user) => user.id === selectedUserId)
  const selectedUserNeedsPasswordChange = Boolean(selectedUser?.mustChangePassword)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      if (!selectedUserId) {
        setError("Seleccione un usuario.")
        return
      }

      if (selectedUserNeedsPasswordChange) {
        setRequiresPasswordChange(true)
        return
      }

      setIsLoading(true)
      const result = await login(selectedUserId, password)

      if (!result.success) {
        setError("Credenciales inválidas. Intente nuevamente.")
        return
      }

      if (result.mustChangePassword) {
        setRequiresPasswordChange(true)
        setPassword("")
        return
      }

      router.push("/dashboard")
    } catch (err) {
      setError("Ocurrió un error al validar sus credenciales.")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

    try {
      setIsLoading(true)
      const success = await updatePassword(trimmedPassword, selectedUserId)

      if (!success) {
        setError("No se pudo actualizar la contraseña. Intente nuevamente.")
        return
      }

      setNewPassword("")
      setConfirmPassword("")
      router.push("/dashboard")
    } catch (err) {
      setError("Ocurrió un error al actualizar la contraseña.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo y título */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">BIOFLEX</h1>
            <p className="text-muted-foreground mt-2">Sistema de Verificación de Productos</p>
          </div>
        </div>

        {/* Formulario */}
        <Card className="border-0 shadow-xl bg-card">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center text-card-foreground">
              {requiresPasswordChange ? "Actualiza tu contraseña" : "Iniciar Sesión"}
            </CardTitle>
            <CardDescription className="text-center">
              {requiresPasswordChange
                ? "Ingresa y confirma tu nueva contraseña para continuar"
                : "Ingrese sus credenciales para acceder al sistema"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={requiresPasswordChange ? handlePasswordChangeSubmit : handleSubmit} className="space-y-4">
              {!requiresPasswordChange ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="usuario" className="text-card-foreground">
                      Usuario
                    </Label>
                    <Popover open={isUserOpen} onOpenChange={setIsUserOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="usuario"
                          variant="outline"
                          role="combobox"
                          aria-expanded={isUserOpen}
                          className="h-14 w-full justify-between text-base"
                          disabled={isLoading || isUsersLoading}
                        >
                          <span className="truncate">
                            {isUsersLoading ? "Cargando usuarios..." : selectedUser ? selectedUser.name : "Seleccione un usuario"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:py-3 [&_[cmdk-item]]:text-base">
                          <CommandInput placeholder="Buscar por nombre o nómina..." />
                          <CommandList className="max-h-80">
                            <CommandEmpty>{isUsersLoading ? "Cargando usuarios..." : "No se encontraron usuarios."}</CommandEmpty>
                            <CommandGroup>
                              {users.map((user) => (
                                <CommandItem
                                  key={user.id}
                                  value={`${user.name} ${user.id}`}
                                  onSelect={() => {
                                    setSelectedUserId(user.id)
                                    setPassword("")
                                    setError("")
                                    setIsUserOpen(false)
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-5 w-5 ${selectedUserId === user.id ? "opacity-100" : "opacity-0"}`}
                                  />
                                  <span className="flex-1">{user.name}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {selectedUserNeedsPasswordChange ? (
                    <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                      Primer acceso detectado. Continúa para registrar tu contraseña.
                    </div>
                  ) : selectedUser ? (
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-card-foreground">
                        Contraseña
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Ingrese su contraseña"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto px-0 text-muted-foreground"
                    disabled={isLoading}
                    onClick={() => {
                      setRequiresPasswordChange(false)
                      setNewPassword("")
                      setConfirmPassword("")
                      setError("")
                    }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Cambiar usuario
                  </Button>

                  <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    Usuario: <span className="font-medium text-foreground">{selectedUser?.name ?? selectedUserId}</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-card-foreground">
                      Nueva contraseña
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-card-foreground">
                      Confirmar contraseña
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </>
              )}

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</div>}

              {!isUsersLoading && users.length === 0 && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  No se pudieron cargar los usuarios. Intente recargar la página.
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading || (!requiresPasswordChange && (isUsersLoading || users.length === 0 || !selectedUserId))}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {requiresPasswordChange ? "Actualizando..." : "Iniciando sesión..."}
                  </>
                ) : requiresPasswordChange ? (
                  "Guardar contraseña"
                ) : selectedUserNeedsPasswordChange ? (
                  "Continuar"
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">Sistema de verificación de calidad BIOFLEX</p>
      </div>
    </div>
  )
}
