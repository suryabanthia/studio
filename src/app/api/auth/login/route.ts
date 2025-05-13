// This route is primarily for setting a session cookie if you choose to manage sessions via HTTP-only cookies.
// Firebase client SDK handles the actual sign-in and provides an ID token.
// For simplicity in this example, we're mostly relying on client-side Firebase sessions.
// If you need server-rendered pages to know auth state without client-side JS, session cookies are useful.

import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/firebaseAdmin';
import { z } from 'zod';

const loginSchema = z.object({
  idToken: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const { idToken } = validation.data;

    // Verify the ID token and get user data.
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Example: Create a session cookie (you'd need a library like `cookies-next` or similar for robust cookie handling)
    // const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    // const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    // const response = NextResponse.json({ status: 'success', uid }, { status: 200 });
    // response.cookies.set('session', sessionCookie, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: expiresIn });
    // return response;
    
    // For now, just confirm token verification
    return NextResponse.json({ status: 'success', uid }, { status: 200 });

  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Failed to process login.', code: error.code }, { status: 401 });
  }
}
