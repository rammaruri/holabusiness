'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '@/components/providers/app-providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { signInWithCredentials } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    setAuthError(null);
    const res = signInWithCredentials(data.email, data.password);
    if (res.success) {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get('return_to');
        router.push(returnTo && returnTo.startsWith('/') ? returnTo : '/');
      } else {
        router.push('/');
      }
    } else {
      setAuthError(res.error || 'Invalid email or password. Please check your credentials.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f6fa] px-4 py-12">
      <div className="w-full max-w-[420px] rounded-[16px] bg-white p-8 sm:p-10 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[#e5e7eb] space-y-6">
        {/* Logo Block */}
        <div className="flex items-center gap-2.5 justify-center">
          <div className="w-[42px] h-[42px] rounded-[10px] bg-[#4361ee] text-white font-bold text-[18px] flex items-center justify-center shadow-[0_2px_6px_rgba(67,97,238,0.25)]">
            HB
          </div>
          <div>
            <div className="text-[20px] font-bold text-[#111827] leading-none">
              HolaBusiness
            </div>
            <div className="text-[11px] text-[#6b7280] mt-0.5">
              Agency Operations OS
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-[22px] font-bold text-[#111827]">
            Sign in
          </h2>
          <p className="text-[13px] text-[#6b7280] mt-1">
            Access your synchronized founder operations workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {authError && (
            <div className="rounded-[8px] bg-red-50 p-3 text-[12px] text-red-600 border border-red-200">
              {authError}
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1.5">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="name@holabusiness.io"
              className="h-[38px] text-[13px]"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-[11px] text-[#ef4444]">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[12px] font-medium text-[#374151] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                className="h-[38px] pr-10 text-[13px]"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-[11px] text-[#ef4444]">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-[40px] rounded-[8px] bg-[#4361ee] hover:bg-[#3451d1] text-white font-medium text-[13px] shadow-[0_2px_6px_rgba(67,97,238,0.25)] gap-2"
          >
            <span>Sign In to Workspace</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
