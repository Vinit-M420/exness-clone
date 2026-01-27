'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BackgroundEffects from '@/components/BackgroundEffects'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // TODO: Replace with your backend API call
    console.log('Login attempt:', { email, password, rememberMe })
    
    // Example API call:
    // const response = await fetch('/api/auth/login', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email, password, rememberMe })
    // })
    
    alert('Login functionality would connect to your backend API here!')
    // router.push('/dashboard') // Redirect after successful login
  }

  const handleSocialLogin = (provider: string) => {
    console.log(`${provider} login clicked`)
    alert(`${provider} login would be implemented here!`)
  }

  return (
    <>
      <BackgroundEffects />
      <div className={styles.authContainer}>
        <Link href="/" className={styles.backButton}>
          ← Back
        </Link>
        
        <div className={styles.authCard}>
          <div className={styles.authLogo}>Exness (Clone)</div>
          <h2 className={styles.authTitle}>Welcome Back</h2>
          <p className={styles.authSubtitle}>Log in to continue trading</p>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email Address</label>
              <input
                type="email"
                className={styles.formInput}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Password</label>
              <input
                type="password"
                className={styles.formInput}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className={styles.forgotPassword}>
              <Link href="/forgot-password">Forgot password?</Link>
            </div>

            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe">Remember me for 30 days</label>
            </div>

            <button type="submit" className={styles.btnAuth}>
              Log In
            </button>
          </form>

          <div className={styles.divider}>OR</div>

          <div className={styles.socialLogin}>
            <button
              type="button"
              className={styles.btnSocial}
              onClick={() => handleSocialLogin('Google')}
            >
              Google
            </button>
            <button
              type="button"
              className={styles.btnSocial}
              onClick={() => handleSocialLogin('Apple')}
            >
              Apple
            </button>
          </div>

          <div className={styles.authFooter}>
            Don't have an account? <Link href="/signup">Sign up</Link>
          </div>
        </div>
      </div>
    </>
  )
}
