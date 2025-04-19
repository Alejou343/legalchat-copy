import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="container flex min-h-screen flex-col items-center justify-center py-12">
      <div className="mx-auto w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  )
} 