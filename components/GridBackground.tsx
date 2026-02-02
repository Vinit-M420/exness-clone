'use client'
import { useEffect } from 'react'

export default function GridBackground() {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const orbs = document.querySelectorAll('[data-glow-orb]')
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
      {/* Grid Background */}
      <div 
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 animate-[gridMove_20s_linear_infinite]"
        style={{
          background: `
            linear-gradient(90deg, rgba(255, 213, 79, 0.03) 1px, transparent 1px),
            linear-gradient(rgba(255, 213, 79, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Glow Orb 1 */}
      {/* <div 
        data-glow-orb
        className="fixed -top-[200px] -right-[200px] w-[600px] h-[600px] rounded-full opacity-15 pointer-events-none z-0 transition-transform duration-300 ease-out animate-[float_15s_ease-in-out_infinite]"
        style={{
          background: 'var(--exness-gold)',
          filter: 'blur(100px)'
        }}
      /> */}
      
      {/* Glow Orb 2 */}
      {/* <div 
        data-glow-orb
        className="fixed -bottom-[200px] -left-[200px] w-[600px] h-[600px] rounded-full opacity-15 pointer-events-none z-0 transition-transform duration-300 ease-out"
        style={{
          background: '#4A90E2',
          filter: 'blur(100px)',
          animation: 'float 20s ease-in-out infinite reverse'
        }}
      /> */}
    </>
  )
}