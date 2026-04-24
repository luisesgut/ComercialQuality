"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  login: (userId: string, password: string) => Promise<boolean>
  updatePassword: (newPassword: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  mustChangePassword: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LOCAL_STORAGE_KEY = "auth_user"
const PASSWORD_OVERRIDES_STORAGE_KEY = "auth_password_overrides"
const MUST_CHANGE_PASSWORD_STORAGE_KEY = "auth_must_change_password"

const DEMO_USERS: Array<User & { password: string }> = [
  {
    id: "0101",
    name: "Administrador (Oliver)",
    password: "0101",
    role: "Administrador",
  },
  {
    id: "2469",
    name: "DIAZ BARAJAS GEMA KAREN",
    password: "2469",
    role: "Administrador",
  },
  {
    id: "3174",
    name: "DURAN UGALDE MOISES DE JESUS",
    password: "3174",
    role: "Verificador",
  },
  {
    id: "2719",
    name: "ESCOTO RAZO SODD AGUSTIN",
    password: "2719",
    role: "Verificador",
  },
  {
    id: "3205",
    name: "GUTIERREZ RAMIREZ ULISES ISAAC",
    password: "3205",
    role: "Verificador",
  },
  {
    id: "3178",
    name: "SERVIN GONZALEZ JORGE LUIS",
    password: "3178",
    role: "Verificador",
  },
  {
    id: "3195",
    name: "BERMUDEZ SANCHEZ MARTIN ALFREDO",
    password: "3195",
    role: "Verificador",
  },
  {
    id: "533",
    name: "ORTEGA MARTINEZ ERIKA LUCIA",
    password: "533",
    role: "Administrador",
  },
  {
    id: "3206",
    name: "RAMIREZ RAMIREZ ERIK EDUARDO",
    password: "3206",
    role: "Verificador",
  },
]

export const LOGIN_USERS: Array<User> = DEMO_USERS.map(({ password: _password, ...user }) => user)

function readPasswordOverrides(): Record<string, string> {
  try {
    const rawValue = localStorage.getItem(PASSWORD_OVERRIDES_STORAGE_KEY)
    if (!rawValue) {
      return {}
    }

    const parsedValue = JSON.parse(rawValue)
    return typeof parsedValue === "object" && parsedValue !== null ? parsedValue : {}
  } catch (error) {
    console.error("Error reading password overrides:", error)
    return {}
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mustChangePassword, setMustChangePassword] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedUser = localStorage.getItem(LOCAL_STORAGE_KEY)
        const storedMustChangePassword = localStorage.getItem(MUST_CHANGE_PASSWORD_STORAGE_KEY)

        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }

        setMustChangePassword(storedMustChangePassword === "true")
      } catch (error) {
        console.error("Error checking session:", error)
      } finally {
        setIsLoading(false)
      }
    }
    checkSession()
  }, [])

  const login = async (userId: string, password: string): Promise<boolean> => {
    try {
      const matchedUser = DEMO_USERS.find((demoUser) => demoUser.id === userId)

      if (!matchedUser) {
        return false
      }

      const passwordOverrides = readPasswordOverrides()
      const effectivePassword = passwordOverrides[userId] ?? matchedUser.password

      if (effectivePassword !== password) {
        return false
      }

      const { password: _password, ...userData } = matchedUser
      const requiresPasswordUpdate = !passwordOverrides[userId]

      setUser(userData)
      setMustChangePassword(requiresPasswordUpdate)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userData))
      localStorage.setItem(MUST_CHANGE_PASSWORD_STORAGE_KEY, String(requiresPasswordUpdate))
      return true
    } catch (error) {
      console.error("Error during login:", error)
      return false
    }
  }

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    try {
      if (!user) {
        return false
      }

      const trimmedPassword = newPassword.trim()
      if (!trimmedPassword) {
        return false
      }

      const passwordOverrides = readPasswordOverrides()
      const updatedOverrides = {
        ...passwordOverrides,
        [user.id]: trimmedPassword,
      }

      localStorage.setItem(PASSWORD_OVERRIDES_STORAGE_KEY, JSON.stringify(updatedOverrides))
      localStorage.setItem(MUST_CHANGE_PASSWORD_STORAGE_KEY, "false")
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
      localStorage.removeItem(MUST_CHANGE_PASSWORD_STORAGE_KEY)
    } catch (error) {
      console.error("Error during logout:", error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, updatePassword, logout, isLoading, mustChangePassword }}>
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
