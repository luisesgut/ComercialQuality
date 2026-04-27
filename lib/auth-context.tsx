"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string
  name: string
  role: string
  mustChangePassword?: boolean
}

interface AuthContextType {
  user: User | null
  users: User[]
  login: (userId: string, password: string) => Promise<LoginResult>
  updatePassword: (newPassword: string, userId?: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  isUsersLoading: boolean
  mustChangePassword: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_API_BASE_URL = "http://172.16.10.31"
const LOCAL_STORAGE_KEY = "auth_user"

type LoginResult = {
  success: boolean
  mustChangePassword?: boolean
}

function normalizeUser(rawUser: any): User | null {
  if (!rawUser || typeof rawUser !== "object") {
    return null
  }

  const id = String(rawUser.id ?? rawUser.userId ?? rawUser.usuarioId ?? rawUser.nomina ?? "").trim()
  const name = String(rawUser.name ?? rawUser.nombre ?? rawUser.fullName ?? rawUser.nombreCompleto ?? "").trim()
  const role = String(rawUser.role ?? rawUser.rol ?? rawUser.perfil ?? "").trim()

  if (!id || !name) {
    return null
  }

  return {
    id,
    name,
    role: role || "Usuario",
    mustChangePassword: Boolean(rawUser.mustChangePassword),
  }
}

function normalizeUsersResponse(payload: any): User[] {
  const rawUsers = Array.isArray(payload) ? payload : payload?.users ?? payload?.data ?? payload?.result ?? []
  if (!Array.isArray(rawUsers)) {
    return []
  }

  return rawUsers.map(normalizeUser).filter((user): user is User => Boolean(user))
}

function normalizeLoginResponse(payload: any, fallbackUser: User | null): { user: User | null; mustChangePassword: boolean } {
  const rawUser = payload?.user ?? payload?.data?.user ?? payload?.data ?? payload
  const user = normalizeUser(rawUser) ?? fallbackUser

  return {
    user,
    mustChangePassword: Boolean(payload?.mustChangePassword ?? payload?.data?.mustChangePassword),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUsersLoading, setIsUsersLoading] = useState(true)
  const [mustChangePassword, setMustChangePassword] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedUser = localStorage.getItem(LOCAL_STORAGE_KEY)

        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }
      } catch (error) {
        console.error("Error checking session:", error)
      } finally {
        setIsLoading(false)
      }
    }
    checkSession()
  }, [])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${AUTH_API_BASE_URL}/api/users`)

        if (!response.ok) {
          throw new Error(`Users request failed with status ${response.status}`)
        }

        const payload = await response.json()
        setUsers(normalizeUsersResponse(payload))
      } catch (error) {
        console.error("Error loading users:", error)
        setUsers([])
      } finally {
        setIsUsersLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const login = async (userId: string, password: string): Promise<LoginResult> => {
    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, password }),
      })

      if (!response.ok) {
        return { success: false }
      }

      const payload = await response.json()
      const fallbackUser = users.find((currentUser) => currentUser.id === userId) ?? null
      const { user: userData, mustChangePassword: requiresPasswordUpdate } = normalizeLoginResponse(payload, fallbackUser)

      if (!userData) {
        return { success: false }
      }

      setUser(userData)
      setMustChangePassword(requiresPasswordUpdate)

      if (requiresPasswordUpdate) {
        localStorage.removeItem(LOCAL_STORAGE_KEY)
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userData))
      }

      return { success: true, mustChangePassword: requiresPasswordUpdate }
    } catch (error) {
      console.error("Error during login:", error)
      return { success: false }
    }
  }

  const updatePassword = async (newPassword: string, userId?: string): Promise<boolean> => {
    try {
      const targetUser = userId ? users.find((currentUser) => currentUser.id === userId) ?? null : user

      if (!targetUser) {
        return false
      }

      const trimmedPassword = newPassword.trim()
      if (!trimmedPassword) {
        return false
      }

      const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/change-password?userId=${encodeURIComponent(targetUser.id)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPassword: trimmedPassword }),
      })

      if (!response.ok) {
        return false
      }

      const updatedUser = {
        ...targetUser,
        mustChangePassword: false,
      }

      setUser(updatedUser)
      setUsers((currentUsers) =>
        currentUsers.map((currentUser) => (currentUser.id === updatedUser.id ? updatedUser : currentUser)),
      )
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedUser))
      setMustChangePassword(false)
      return true
    } catch (error) {
      console.error("Error updating password:", error)
      return false
    }
  }

  const logout = async () => {
    try {
      setUser(null)
      setMustChangePassword(false)
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    } catch (error) {
      console.error("Error during logout:", error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, users, login, updatePassword, logout, isLoading, isUsersLoading, mustChangePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
