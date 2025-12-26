import { AuthCard } from '@/components/auth/auth-card'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Reset Password"
      description="Enter your email to receive a password reset link"
    >
      <ResetPasswordForm />
    </AuthCard>
  )
}
