import { AuthCard } from '@/components/auth/auth-card'
import { SignupForm } from '@/components/auth/signup-form'

export default function SignupPage() {
  return (
    <AuthCard
      title="Create Account"
      description="Enter your details to create a new account"
    >
      <SignupForm />
    </AuthCard>
  )
}
