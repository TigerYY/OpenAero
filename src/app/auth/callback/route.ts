
import { type NextRequest, NextResponse } from 'next/server';

/**
 * This route acts as a bridge to fix an incorrect redirect URL from Supabase.
 * It catches requests to `/auth/callback` and permanently redirects them 
 * to the correct handler at `/api/auth/callback`, preserving all search parameters.
 */
export function GET(request: NextRequest) {
  // Clone the request URL to safely modify it
  const redirectUrl = new URL(request.url);
  
  // Prepend '/api' to the pathname
  redirectUrl.pathname = '/api/auth/callback';

  // Perform a permanent redirect to the correct URL
  return NextResponse.redirect(redirectUrl, {
    status: 301, // Use 301 for permanent redirect
  });
}
