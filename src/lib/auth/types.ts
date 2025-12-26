export type UserRole = 'admin' | 'manager' | 'user' | 'viewer'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  department: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface AuthResult {
  success: boolean
  error?: string
  redirectTo?: string
}
