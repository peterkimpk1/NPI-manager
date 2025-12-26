'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { AuthResult } from './types'

export async function signUp(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, redirectTo: '/login?message=Check your email to confirm your account' }
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient()
  const headersList = await headers()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirectTo') as string || '/dashboard'

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // Log sign in to audit log
  if (data.user) {
    try {
      await supabase.rpc('log_audit_entry', {
        p_user_id: data.user.id,
        p_action: 'sign_in',
        p_details: { email: data.user.email },
        p_ip_address: headersList.get('x-forwarded-for') ?? undefined,
        p_user_agent: headersList.get('user-agent') ?? undefined,
      })
    } catch {
      // Audit logging is non-critical, continue on failure
    }
  }

  revalidatePath('/', 'layout')
  return { success: true, redirectTo }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  const headersList = await headers()

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Log sign out to audit log
    try {
      await supabase.rpc('log_audit_entry', {
        p_user_id: user.id,
        p_action: 'sign_out',
        p_ip_address: headersList.get('x-forwarded-for') ?? undefined,
        p_user_agent: headersList.get('user-agent') ?? undefined,
      })
    } catch {
      // Audit logging is non-critical, continue on failure
    }
  }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/update-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, redirectTo: '/login?message=Check your email for password reset link' }
}

export async function updatePassword(formData: FormData): Promise<AuthResult> {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true, redirectTo: '/dashboard' }
}
