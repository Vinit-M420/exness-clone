'use client'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AuthLayout from '@/components/authLayout'
import BackgroundEffects from '@/components/BackgroundEffects'
import Navbar from "@/components/navbar";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState("");
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter();
  // Password validation states
  const hasLength = password.length >= 8 && password.length <= 15
  const hasUpperLower = /[a-z]/.test(password) && /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // console.log('Signup:', { email, password })

    try{
      const response = await fetch(`${API_BASE}/api/v1/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
       });

      const data = await response.json().catch(() => ({}));

      if (!response.ok){
      alert(data.message || "Sign up failed");
      return
      }

      //  if (response.ok) console.log(data.message || "Signup successfully")
      localStorage.setItem("token", data.token);
      router.push("/login");
    }catch(e){
      console.error("Error signing up:", e);
      alert("Network error. Please try again.");
    }

  }

  return (
    <>
      <BackgroundEffects />
      <Navbar />
      <AuthLayout>
        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-(--exness-text)">
              Your Name
            </Label>
            <Input
              id="name"
              type="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 bg-white border-gray-300 text-white placeholder:text-gray-400 focus:border-gray-400 focus:ring-0"
              required
            />
          </div>

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
                className="h-12 bg-white border-gray-300 text-white placeholder:text-gray-200 focus:border-gray-400 focus:ring-0 pr-10"
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

            {/* Password Requirements */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${hasLength ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className={hasLength ? 'text-gray-400' : 'text-gray-500'}>
                  Between 8-15 characters
                </span>
                {password.length > 0 && (
                  <span className="ml-auto text-gray-500">{password.length}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${hasUpperLower ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className={hasUpperLower ? 'text-gray-400' : 'text-gray-500'}>
                  At least one upper and one lower case letter
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${hasNumber ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className={hasNumber ? 'text-gray-400' : 'text-gray-500'}>
                  At least one number
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${hasSpecial ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className={hasSpecial ? 'text-gray-400' : 'text-gray-500'}>
                  At least one special character
                </span>
              </div>
            </div>
          </div>

          {/* Register Button */}
          <Button
            type="submit"
            className="w-full h-12 bg-[#FFD700] hover:bg-[#FFC700] text-black font-semibold text-base transition-colors"
            disabled={!hasLength || !hasUpperLower || !hasNumber || !hasSpecial || !email}
          >
            Register
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-gray-700" />

            <span className="text-sm text-gray-400 whitespace-nowrap">
              Or create a account with
            </span>

            <div className="flex-1 border-t border-gray-700" />
         </div>

          {/* Google Sign Up */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium border-gray-300"
            onClick={() => console.log('Google sign up')}
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
        </form>
      </AuthLayout>
    </>
  )
}