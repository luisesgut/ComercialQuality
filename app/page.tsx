import { AuthProvider } from "@/lib/auth-context"
import { LoginForm } from "@/components/login-form"

export default function HomePage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  )
}
