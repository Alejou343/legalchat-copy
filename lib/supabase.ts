import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client for server-side usage.
 *
 * Reads environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Throws an error if these are missing.
 *
 * @throws {Error} If required environment variables are not defined.
 * @returns {import('@supabase/supabase-js').SupabaseClient} Supabase client instance for server-side.
 */

export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

/**
 * Creates a Supabase client for browser usage with SSR support.
 *
 * Reads environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Throws an error if these are missing.
 *
 * @throws {Error} If required environment variables are not defined.
 * @returns {import('@supabase/ssr').SupabaseClient} Supabase client instance for browser-side.
 */

export const createBrowserSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createBrowserClient(supabaseUrl, supabaseKey)
} 