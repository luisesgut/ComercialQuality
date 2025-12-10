"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LOCAL_STORAGE_KEY = "auth_user"

const DEMO_USERS: Array<User & { password: string }> = [
  {
    id: "1",
    name: "Administrador",
    email: "admin@bioflex.com",
    password: "admin123",
    role: "Administrador",
  },
  {
    id: "2",
    name: "Inspector",
    email: "inspector@bioflex.com",
    password: "inspector123",
    role: "Inspector de Calidad",
  },
  {
    id: "2",
    name: "Inspector",
    email: "test@bioflex.com",
    password: "test123",
    role: "Inspector de Calidad",
  },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const matchedUser = DEMO_USERS.find(
        (demoUser) => demoUser.email === email.toLowerCase() && demoUser.password === password,
      )

      if (matchedUser) {
        const { password: _password, ...userData } = matchedUser
        setUser(userData)
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userData))
        return true
      }

      return false
    } catch (error) {
      console.error("Error during login:", error)
      return false
    }
  }

  const logout = async () => {
    try {
      setUser(null)
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    } catch (error) {
      console.error("Error during logout:", error)
    }
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
