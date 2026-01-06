import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Logout endpoint - primarily for client-side token cleanup
 * Server-side JWT tokens are stateless, so no server-side invalidation needed
 */
export async function POST() {
  try {
    // For JWT-based auth, logout is handled client-side by removing the token
    // This endpoint exists for consistency and potential future session management

    return NextResponse.json({
      message: 'Logout successful'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API /auth/logout] Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
