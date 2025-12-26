import { AuthCard } from '@/components/auth/auth-card'
import { LoginForm } from '@/components/auth/login-form'

interface LoginPageProps {
  searchParams: Promise<{ message?: string; redirectTo?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams

  return (
    <AuthCard
      title="Sign In"
      description="Enter your credentials to access your account"
    >
      {params.message && (
        <div className="mb-4 p-3 rounded-md bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-sm">
          {params.message}
        </div>
      )}
      <LoginForm redirectTo={params.redirectTo} />
    </AuthCard>
  )
}
