import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/firebaseAdmin';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const { email, password } = validation.data;

    const userRecord = await adminAuth.createUser({
      email,
      password,
      emailVerified: false, // Or true if you don't require email verification
    });
    
    // Optionally, create a user document in Firestore
    // await adminDb.collection('users').doc(userRecord.uid).set({
    //   email: userRecord.email,
    //   createdAt: new Date(),
    //   // any other initial user data
    // });

    return NextResponse.json({ uid: userRecord.uid, email: userRecord.email }, { status: 201 });
  } catch (error: any) {
    console.error('Signup API error:', error);
    // Firebase specific error codes can be handled here for better client messages
    let errorMessage = 'An unexpected error occurred during signup.';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'This email address is already in use.';
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = 'Password should be at least 6 characters.';
    }
    return NextResponse.json({ error: errorMessage, code: error.code }, { status: 400 });
  }
}
