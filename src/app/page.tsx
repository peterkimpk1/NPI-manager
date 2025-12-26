import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth/queries'

export default async function Home() {
  const user = await getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
