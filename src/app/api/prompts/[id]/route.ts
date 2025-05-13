import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import { verifyIdToken } from '@/lib/firebase/firebaseAdminAuth';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import type { FirebasePrompt } from '@/types/firebase.types';

const updatePromptSchema = z.object({
  name: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  folderId: z.string().nullable().optional(),
  isFavorite: z.boolean().optional(),
});

// GET a specific prompt
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const promptId = params.id;
    const promptDoc = await adminDb.collection('prompts').doc(promptId).get();

    if (!promptDoc.exists) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    const promptData = promptDoc.data() as FirebasePrompt;
    if (promptData.userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ id: promptDoc.id, ...promptData }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json({ error: 'Failed to fetch prompt', details: error.message }, { status: 500 });
  }
}

// PUT (update) a specific prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const promptId = params.id;
    const body = await request.json();
    const validation = updatePromptSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const promptRef = adminDb.collection('prompts').doc(promptId);
    const promptSnapshot = await promptRef.get();

    if (!promptSnapshot.exists) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    const currentPromptData = promptSnapshot.data() as FirebasePrompt;
    if (currentPromptData.userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: Partial<FirebasePrompt> & { updatedAt: Timestamp } = {
        ...validation.data,
        updatedAt: Timestamp.now(),
    };
    
    let newVersionNumber = currentPromptData.versions;

    // If content is changing, create a new version
    if (validation.data.content && validation.data.content !== currentPromptData.content) {
        newVersionNumber += 1;
        updateData.versions = newVersionNumber; // Update total versions count on the prompt

        // Save current content as a new version history entry
        const oldVersionData = {
            userId: decodedToken.uid,
            versionNumber: currentPromptData.versions, // The version number it *was*
            content: currentPromptData.content,
            timestamp: currentPromptData.updatedAt, // When this version was last "current"
        };
        await promptRef.collection('versions').doc(String(currentPromptData.versions)).set(oldVersionData);
        
        // Update the prompt with new content and incremented version number
        // The new content will itself be implicitly version newVersionNumber (currentPromptData.versions + 1)
    }


    await promptRef.update(updateData);
    
    // If content changed, the new "current" content forms the latest version, but isn't explicitly stored in 'versions' collection until it's superseded.
    // The 'versions' field on the prompt tracks the highest version number *that is now in history*.
    // So, if content changed, versions becomes N+1. The content for V(N+1) is prompt.content. V(N) is now in history.


    return NextResponse.json({ id: promptId, ...updateData }, { status: 200 });

  } catch (error: any) {
    console.error('Error updating prompt:', error);
    return NextResponse.json({ error: 'Failed to update prompt', details: error.message }, { status: 500 });
  }
}

// DELETE a specific prompt
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const promptId = params.id;
    const promptRef = adminDb.collection('prompts').doc(promptId);
    const promptSnapshot = await promptRef.get();

    if (!promptSnapshot.exists) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    if (promptSnapshot.data()?.userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Firestore doesn't automatically delete subcollections.
    // We need to delete all documents in the 'versions' subcollection first.
    const versionsSnapshot = await promptRef.collection('versions').get();
    const batch = adminDb.batch();
    versionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Then delete the prompt document itself
    await promptRef.delete();

    return NextResponse.json({ message: 'Prompt and its versions deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting prompt:', error);
    return NextResponse.json({ error: 'Failed to delete prompt', details: error.message }, { status: 500 });
  }
}

// GET versions for a specific prompt
export async function GET_VERSIONS( // Custom method name, Next.js doesn't map this directly. Need to call from GET or separate route.
  request: NextRequest,
  { params }: { params: { id: string } } // promptId
) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const promptId = params.id;
  try {
    // First, verify the user owns the main prompt document
    const promptDoc = await adminDb.collection('prompts').doc(promptId).get();
    if (!promptDoc.exists || promptDoc.data()?.userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Prompt not found or unauthorized' }, { status: 404 });
    }

    const versionsSnapshot = await adminDb.collection('prompts').doc(promptId).collection('versions')
      .where('userId', '==', decodedToken.uid) // Redundant if parent check is done, but good for direct subcollection query rules
      .orderBy('versionNumber', 'desc')
      .get();

    const versions = versionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(versions, { status: 200 });
  } catch (error) {
    console.error(`Error fetching versions for prompt ${promptId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch prompt versions' }, { status: 500 });
  }
}

// You might want a specific route for versions, e.g., /api/prompts/[id]/versions
// For now, I'm adding it as a conceptual GET_VERSIONS function.
// To use it, you'd need to modify the GET handler to check for a query param like `?versions=true`
// or create a new route file: src/app/api/prompts/[id]/versions/route.ts
