'use client'

import { useEffect } from 'react'
import styles from './BackgroundEffects.module.css'

export default function BackgroundEffects() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const orbs = document.querySelectorAll(`.${styles.glowOrb}`)
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight
      
      orbs.forEach((orb, index) => {
        const speed = (index + 1) * 20
        const element = orb as HTMLElement
        element.style.transform = `translate(${x * speed}px, ${y * speed}px)`
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <>
      <div className={styles.bgGrid}></div>
      <div className={`${styles.glowOrb} ${styles.glowOrb1}`}></div>
      <div className={`${styles.glowOrb} ${styles.glowOrb2}`}></div>
    </>
  )
}
