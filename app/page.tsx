'use client'
import Link from 'next/link'
import BackgroundEffects from '@/components/BackgroundEffects'
import styles from "./page.module.css"

export default function Home() {
  return (
    <>
      <BackgroundEffects />
      <main className={styles.launchContainer}>
        <div className={styles.logo}>Exness (Clone)</div>
        
        <h1 className={styles.heroTitle}>Trade CFDs with Real-Time Execution</h1>
        
        <p className={styles.heroSubtitle}>
          A demo trading platform inspired by Exness. Supports <span>market orders,</span> <span>limit orders</span>, 
          <span> stop-loss</span>, <span>take-profit</span>, and <span>live price updates</span>.
        </p>

        <div className={styles.ctaButtons}>
          <Link href="/login" className={`${styles.btn} ${styles.btnPrimary}`}>
            <span>Log in</span>
          </Link>
          <Link href="/signup" className={`${styles.btn} ${styles.btnSecondary}`}>
            <span>Sign up</span>
          </Link>
        </div>

        {/* <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>⚡</div>
            <div className={styles.featureTitle}>Real-Time Execution</div>
            <div className={styles.featureText}>Lightning-fast order processing</div>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>📊</div>
            <div className={styles.featureTitle}>Advanced Orders</div>
            <div className={styles.featureText}>Market, limit, stop-loss & more</div>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🔒</div>
            <div className={styles.featureTitle}>Secure Trading</div>
            <div className={styles.featureText}>Bank-grade security protocols</div>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>📈</div>
            <div className={styles.featureTitle}>Live Updates</div>
            <div className={styles.featureText}>Real-time price feeds</div>
          </div>
        </div> */}
      </main>
    </>
  )
}