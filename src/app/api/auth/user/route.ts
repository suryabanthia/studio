import { NextResponse, type NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/firebaseAdminAuth';
import { adminDb } from '@/lib/firebase/firebaseAdmin';

export async function GET(request: NextRequest) {
  const decodedToken = await verifyIdToken(request);

  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Optionally, fetch additional user data from Firestore
    // const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    // if (!userDoc.exists) {
    //   return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    // }
    // const userData = userDoc.data();

    return NextResponse.json({ 
      uid: decodedToken.uid, 
      email: decodedToken.email, 
      emailVerified: decodedToken.email_verified,
      // ...userData // if fetched from Firestore
    }, { status: 200 });
  } catch (error: any) {
    console.error('Get User API error:', error);
    return NextResponse.json({ error: 'Failed to fetch user data.' }, { status: 500 });
  }
}
