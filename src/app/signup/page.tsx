"use client";

import React, { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    agreed: false
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreed) {
      alert("Please agree to the Terms & Conditions.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      
      localStorage.setItem("token", data.token);
      window.location.href = "/storage";
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-sans bg-[#111111] text-gray-200">
      
      {/* Left Panel - Visual Branding */}
      <div 
        className="hidden lg:flex w-1/2 flex-col justify-between p-10 relative overflow-hidden"
        style={{
          backgroundImage: "url('/signup.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        {/* Top Header inside Image */}
        <div className="relative z-10 flex items-center justify-between w-full">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20">
              <div className="w-3 h-3 bg-white rounded-sm transform rotate-45"></div>
            </div>
            <span className="font-semibold text-xl tracking-wide text-white">Nexel</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex flex-col relative items-center justify-center p-6 sm:p-12">
        
        {/* Top Right "Back to website" Pill */}
        <a 
          href="/" 
          className="absolute top-4 right-4 md:top-10 md:right-10 flex items-center gap-1.5 bg-[#2A2A30] hover:bg-[#33333A] px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium text-white transition-colors border border-white/5 shadow-md"
        >
          Back to website <ArrowRight className="w-3.5 h-3.5" />
        </a>

        <div className="w-full max-w-[440px] mt-12">
          <h1 className="text-4xl font-semibold text-white mb-2 tracking-tight">Create an account</h1>
          <p className="text-gray-400 text-sm mb-6">
            Already have an account? <a href="/login" className="text-emerald-500 hover:underline underline-offset-4">Log in</a>
          </p>

          {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-6">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Row */}
            <div className="flex gap-4">
              <div className="flex-1">
                <input 
                  type="text" 
                  placeholder="First name"
                  required
                  className="w-full bg-[#1A1A1A] border border-[#333] text-white px-4 py-3.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-gray-500"
                  value={formData.firstName}
                  onChange={e => setFormData({...formData, firstName: e.target.value})}
                />
              </div>
              <div className="flex-1">
                <input 
                  type="text" 
                  placeholder="Last name"
                  required
                  className="w-full bg-[#1A1A1A] border border-[#333] text-white px-4 py-3.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-gray-500"
                  value={formData.lastName}
                  onChange={e => setFormData({...formData, lastName: e.target.value})}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <input 
                type="email" 
                placeholder="Email"
                required
                className="w-full bg-[#1A1A1A] border border-[#333] text-white px-4 py-3.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-gray-500"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                required
                className="w-full bg-[#1A1A1A] border border-[#333] text-white px-4 py-3.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-gray-500 pr-12"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-3 pt-2">
              <div className="flex items-center h-5">
                <input 
                  type="checkbox" 
                  id="terms" 
                  required
                  checked={formData.agreed}
                  onChange={e => setFormData({...formData, agreed: e.target.checked})}
                  className="w-4 h-4 rounded border-[#333] bg-[#1A1A1A] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-[#111]"
                />
              </div>
              <label htmlFor="terms" className="text-sm text-gray-400 select-none">
                I agree to the <a href="#" className="text-gray-300 underline underline-offset-2 hover:text-white">Terms & Conditions</a>
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold py-3.5 rounded-lg transition-colors mt-6 shadow-lg shadow-emerald-500/20"
            >
              {loading ? "Creating..." : "Create account"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8 opacity-60">
              <div className="flex-1 h-px bg-[#333]"></div>
              <span className="text-xs text-gray-400">Or register with</span>
              <div className="flex-1 h-px bg-[#333]"></div>
            </div>

            {/* Social Logins */}
            <div className="flex gap-4">
              <button type="button" className="flex-1 flex items-center justify-center gap-2 bg-transparent border border-[#333] hover:border-[#555] hover:bg-[#1A1A1A] text-gray-300 py-3 rounded-lg text-sm font-medium transition-colors">
                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button type="button" className="flex-1 flex items-center justify-center gap-2 bg-transparent border border-[#333] hover:border-[#555] hover:bg-[#1A1A1A] text-gray-300 py-3 rounded-lg text-sm font-medium transition-colors">
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.126 3.822 3.08 1.567-.052 2.164-.96 4.053-.96 1.884 0 2.417.96 4.053.94 1.67-.033 2.705-1.503 3.708-2.97 1.165-1.688 1.646-3.325 1.666-3.415-.038-.016-3.21-1.229-3.238-4.912-.026-3.083 2.532-4.568 2.656-4.636-1.439-2.09-3.669-2.37-4.48-2.42-1.875-.12-3.702 1.228-4.832 1.228zM14.72 4.41c.823-1.01 1.378-2.413 1.227-3.81-.131-.005-.262-.008-.393-.008-1.558 0-3.076.848-3.931 1.875-.762.906-1.396 2.348-1.218 3.722 1.442.112 2.871-.78 3.65-1.778z"/>
                </svg>
                Apple
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
