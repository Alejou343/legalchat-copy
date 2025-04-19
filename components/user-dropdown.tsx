"use client"

import * as React from "react"
import { LogOut, User } from "lucide-react"
import { useTheme } from "next-themes"
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"

export function UserDropdown() {
  const { setTheme, theme } = useTheme()
  const [user, setUser] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const router = useRouter()
  
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          setUser(data.session.user)
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUser()
  }, [])
  
  const handleLogout = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      await supabase.auth.signOut()
      router.refresh()
      router.push('/auth/login')
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted">
          <User className="h-4 w-4" />
          <span className="sr-only">User menu</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user && (
          <>
            <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <div className="flex w-full items-center justify-between gap-2">
            <span>Toggle Theme</span>
            <ThemeToggle />
          </div>
        </DropdownMenuItem>
        {user && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 