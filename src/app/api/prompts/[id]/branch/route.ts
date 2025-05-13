import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import { verifyIdToken } from '@/lib/firebase/firebaseAdminAuth';
import { Timestamp } from 'firebase-admin/firestore';
import type { FirebasePrompt } from '@/types/firebase.types';

// POST to branch a prompt
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const originalPromptId = params.id;

  try {
    const originalPromptRef = adminDb.collection('prompts').doc(originalPromptId);
    const originalPromptSnap = await originalPromptRef.get();

    if (!originalPromptSnap.exists) {
      return NextResponse.json({ error: 'Original prompt not found' }, { status: 404 });
    }

    const originalPromptData = originalPromptSnap.data() as FirebasePrompt;

    if (originalPromptData.userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Forbidden: You do not own this prompt' }, { status: 403 });
    }

    // Create new branched prompt data
    const newPromptRef = adminDb.collection('prompts').doc(); // New ID for the branched prompt
    const now = Timestamp.now();

    const branchedPromptData: Omit<FirebasePrompt, 'id'> = {
      ...originalPromptData, // Copy all fields from original
      name: `${originalPromptData.name} (Branch)`, // Modify name
      createdAt: now,
      updatedAt: now,
      versions: 1, // Reset version count for the new branch
      // folderId will be copied, isFavorite can be reset or copied based on preference
      isFavorite: false, // Example: reset favorite status for branch
    };

    await newPromptRef.set(branchedPromptData);

    // Optionally, copy version history if needed (more complex, omitted for simplicity here)
    // For a true branch with history, you'd need to copy the 'versions' subcollection.
    // This example creates a new prompt based on the current state of the original.

    const newPromptDoc = await newPromptRef.get();
    const newPrompt = { id: newPromptDoc.id, ...newPromptDoc.data() } as FirebasePrompt;

    return NextResponse.json(newPrompt, { status: 201 });

  } catch (error: any) {
    console.error(`Error branching prompt ${originalPromptId}:`, error);
    return NextResponse.json({ error: 'Failed to branch prompt', details: error.message }, { status: 500 });
  }
}
