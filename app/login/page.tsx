'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AuthLayout from '@/components/authLayout'
import Navbar from '@/components/navbar'
import BackgroundEffects from '@/components/BackgroundEffects'
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // console.log('Login:', { email, password })
    setIsLoading(true);

    try{
       const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
       });

       const data = await response.json().catch(() => ({}));

       if (!response.ok){
        alert(data.message || "Login failed");
        setIsLoading(false);
        return
       }

      if (response.ok){
      localStorage.setItem("token", data.token);
      setIsLoading(false);
      router.push("/dashboard");
      }
    }
    catch(e){
      console.error("Error logging in:", e);
      alert("Network error. Please try again.");
    }
  }

  return (
    <>
      <BackgroundEffects />
      <Navbar />
      <AuthLayout>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-(--exness-text)">
              Your email address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-white border-gray-300 text-white placeholder:text-gray-400 focus:border-gray-400 focus:ring-0"
              required
            />
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-(--exness-text)">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-white border-gray-300 text-white placeholder:text-gray-400 focus:border-gray-400 focus:ring-0 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Log In Button */}
          <Button
            type="submit"
            disabled={isLoading || !email || !password}
            className="mt-5 w-full h-12 bg-[#FFD700] hover:bg-[#FFC700] text-black font-semibold text-base transition-colors"
          >
            {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" />Logging In...</>) : ('Log In')}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-gray-700" />

            <span className="text-sm text-gray-400 whitespace-nowrap">
              Or Log in with
            </span>

            <div className="flex-1 border-t border-gray-700" />
         </div>


          {/* Google Log In */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium border-gray-300"
            onClick={() => console.log('Google Log in')}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>

          {/* Forgot Password Link */}
          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
            >
              I forgot my password
            </Link>
          </div>
        </form>
      </AuthLayout>
    </>
  )
}