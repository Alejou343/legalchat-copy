"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginMessage() {
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get("message");
  const [message, setMessage] = useState<string | null>(initialMessage);

  useEffect(() => {
    if (initialMessage) {
      setMessage(initialMessage);
    }
  }, [initialMessage]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!message) return null;

  return (
    <div className="mt-6 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-green-800 shadow-sm flex items-center gap-2">
      <svg
        className="h-5 w-5 text-green-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <title>Success</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12">
      <div className="mx-auto w-full max-w-md">
        <LoginForm />
        <Suspense fallback={null}>
          <LoginMessage />
        </Suspense>
      </div>
    </div>
  );
}