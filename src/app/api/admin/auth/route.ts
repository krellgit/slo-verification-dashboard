import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword } from '@/lib/serverConfig';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'slovd_admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a simple session token
 */
function generateSessionToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

/**
 * POST /api/admin/auth - Login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      );
    }

    if (!verifyAdminPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = Date.now() + SESSION_DURATION;

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, `${sessionToken}:${expiresAt}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/auth - Check session
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE);

    if (!session?.value) {
      return NextResponse.json({ authenticated: false });
    }

    const [, expiresAt] = session.value.split(':');
    const expiry = parseInt(expiresAt, 10);

    if (isNaN(expiry) || Date.now() > expiry) {
      // Session expired
      cookieStore.delete(SESSION_COOKIE);
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}

/**
 * DELETE /api/admin/auth - Logout
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
