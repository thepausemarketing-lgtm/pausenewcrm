import LoginForm from '@/components/auth/LoginForm'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/pause-logo.png"
            alt="The Pause Marketing"
            width={180}
            height={100}
            className="object-contain mb-2"
            priority
          />
          <p className="text-gray-500 text-sm">Sign in to your workspace</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
