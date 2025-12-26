'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from '@/lib/auth/actions'
import { Loader2 } from 'lucide-react'

interface LoginFormProps {
  redirectTo?: string
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    if (redirectTo) {
      formData.append('redirectTo', redirectTo)
    }

    const result = await signIn(formData)

    if (!result.success) {
      setError(result.error || 'An error occurred')
      setIsLoading(false)
      return
    }

    if (result.redirectTo) {
      router.push(result.redirectTo)
      router.refresh()
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-md bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          disabled={isLoading}
          className="bg-bg-tertiary border-border-custom focus:border-accent-cyan"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/reset-password"
            className="text-sm text-accent-cyan hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          required
          disabled={isLoading}
          className="bg-bg-tertiary border-border-custom focus:border-accent-cyan"
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-accent-cyan hover:bg-accent-cyan/90 text-bg-primary font-semibold"
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign In
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-accent-cyan hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  )
}
