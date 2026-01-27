'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BackgroundEffects from '@/components/BackgroundEffects'
import styles from './signup.module.css'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!')
      return
    }

    if (!formData.agreeTerms) {
      alert('Please agree to the Terms & Conditions')
      return
    }
    
    // TODO: Replace with your backend API call
    console.log('Signup attempt:', formData)
    
    // Example API call:
    // const response = await fetch('/api/auth/signup', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     fullName: formData.fullName,
    //     email: formData.email,
    //     password: formData.password
    //   })
    // })
    
    alert('Signup functionality would connect to your backend API here!')
    // router.push('/dashboard') // Redirect after successful signup
  }

  const handleSocialSignup = (provider: string) => {
    console.log(`${provider} signup clicked`)
    alert(`${provider} signup would be implemented here!`)
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
          <h2 className={styles.authTitle}>Create Account</h2>
          <p className={styles.authSubtitle}>Start trading in minutes</p>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Full Name</label>
              <input
                type="text"
                name="fullName"
                className={styles.formInput}
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email Address</label>
              <input
                type="email"
                name="email"
                className={styles.formInput}
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Password</label>
              <input
                type="password"
                name="password"
                className={styles.formInput}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                className={styles.formInput}
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="agreeTerms"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                required
              />
              <label htmlFor="agreeTerms">I agree to the Terms & Conditions</label>
            </div>

            <button type="submit" className={styles.btnAuth}>
              Create Account
            </button>
          </form>

          <div className={styles.divider}>OR</div>

          <div className={styles.socialLogin}>
            <button
              type="button"
              className={styles.btnSocial}
              onClick={() => handleSocialSignup('Google')}
            >
              Google
            </button>
            <button
              type="button"
              className={styles.btnSocial}
              onClick={() => handleSocialSignup('Apple')}
            >
              Apple
            </button>
          </div>

          <div className={styles.authFooter}>
            Already have an account? <Link href="/login">Log in</Link>
          </div>
        </div>
      </div>
    </>
  )
}
