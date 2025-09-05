import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

// Note: place your actual assets at these paths
import blackLogo from '@/assets/logo-black.svg'
import whiteLogo from '@/assets/logo-white.svg'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleEmailContinue = async () => {
    try {
      setLoading(true)
      // In development, simulate login by storing a token.
      // Replace with Firebase or your auth flow when ready.
      localStorage.setItem('authToken', 'dev-token')
      localStorage.setItem('userEmail', email)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleContinue = () => {
    // Placeholder for Google OAuth
    // You can wire this to Firebase Auth Google provider later
    setLoading(true)
    setTimeout(() => {
      localStorage.setItem('authToken', 'dev-google-token')
      localStorage.setItem('userEmail', 'google-user@example.com')
      navigate('/')
    }, 800)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="w-full max-w-md border rounded-xl p-8 shadow-sm bg-card">
        {/* Logos: black on light, white on dark */}
        <div className="flex justify-center mb-8">
          <img data-testid="logo-black" src={blackLogo} alt="Cape Christian" className="h-10 dark:hidden" />
          <img data-testid="logo-white" src={whiteLogo} alt="Cape Christian" className="h-10 hidden dark:block" />
        </div>

        <h1 className="text-2xl font-semibold text-center mb-6">Sign in</h1>

        {!showEmailForm && (
          <div className="space-y-3">
            <Button className="w-full" variant="default" onClick={() => setShowEmailForm(true)} disabled={loading}>
              Continue with Email
            </Button>
            <Button className="w-full" variant="secondary" onClick={handleGoogleContinue} disabled={loading}>
              Continue with Google
            </Button>
          </div>
        )}

        {showEmailForm && (
          <div className="space-y-4">
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@church.org"
              className="w-full px-3 py-2 rounded-md border bg-background"
            />
            <Button className="w-full" onClick={handleEmailContinue} disabled={!email || loading}>
              Continue
            </Button>
            <Button className="w-full" variant="ghost" onClick={() => setShowEmailForm(false)} disabled={loading}>
              Back
            </Button>
          </div>
        )}

        <p className="text-xs text-center mt-6 text-muted-foreground">
          By continuing, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  )
}

export default Login
