import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import { verifyIdToken } from '@/lib/firebase/firebaseAdminAuth';
import type { FirebasePromptVersion } from '@/types/firebase.types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } } // promptId
) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const promptId = params.id;
  try {
    const promptDoc = await adminDb.collection('prompts').doc(promptId).get();
    if (!promptDoc.exists) {
        return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }
    if (promptDoc.data()?.userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Forbidden: You do not own this prompt' }, { status: 403 });
    }

    const versionsSnapshot = await adminDb.collection('prompts').doc(promptId).collection('versions')
      .orderBy('versionNumber', 'desc')
      .get();

    const versions: FirebasePromptVersion[] = versionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp,
        } as FirebasePromptVersion;
    });
    
    return NextResponse.json(versions, { status: 200 });
  } catch (error) {
    console.error(`Error fetching versions for prompt ${promptId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch prompt versions', details: (error as Error).message }, { status: 500 });
  }
}
