"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LOGIN_USERS, useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Shield, Lock, Loader2, Check, ChevronsUpDown } from "lucide-react"

export function LoginForm() {
  const [selectedUserId, setSelectedUserId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUserOpen, setIsUserOpen] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      if (!selectedUserId) {
        setError("Seleccione un usuario.")
        return
      }

      setIsLoading(true)
      const success = await login(selectedUserId, password)

      if (success) {
        router.push("/dashboard")
      } else {
        setError("Credenciales inválidas. Intente nuevamente.")
      }
    } catch (err) {
      setError("Ocurrió un error al validar sus credenciales.")
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
            <CardTitle className="text-xl text-center text-card-foreground">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center">Ingrese sus credenciales para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                      disabled={isLoading}
                    >
                      <span className="truncate">
                        {selectedUserId
                          ? LOGIN_USERS.find((user) => user.id === selectedUserId)?.name
                          : "Seleccione un usuario"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command className="**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:py-3 [&_[cmdk-item]]:text-base">
                      <CommandInput placeholder="Buscar por nombre o nómina..." />
                      <CommandList className="max-h-80">
                        <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                        <CommandGroup>
                          {LOGIN_USERS.map((user) => (
                            <CommandItem
                              key={user.id}
                              value={`${user.name} ${user.id}`}
                              onSelect={() => {
                                setSelectedUserId(user.id)
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

              <div className="space-y-2">
                <Label htmlFor="password" className="text-card-foreground">
                  Contraseña (nómina)
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    inputMode="numeric"
                    placeholder="Ej. 2469"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</div>}

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
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
