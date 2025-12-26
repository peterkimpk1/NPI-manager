import { AuthCard } from '@/components/auth/auth-card'
import { UpdatePasswordForm } from '@/components/auth/update-password-form'

export default function UpdatePasswordPage() {
  return (
    <AuthCard
      title="Update Password"
      description="Enter your new password"
    >
      <UpdatePasswordForm />
    </AuthCard>
  )
}
