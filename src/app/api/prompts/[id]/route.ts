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

export type UpdatePromptPayload = z.infer<typeof updatePromptSchema>;

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

    const updateData: any = { // Use any for flexibility, or a more specific Partial<FirebasePrompt> & { updatedAt: Timestamp }
        updatedAt: Timestamp.now(),
    };
    
    if (validation.data.name !== undefined) updateData.name = validation.data.name;
    if (validation.data.content !== undefined) updateData.content = validation.data.content;
    if (validation.data.folderId !== undefined) updateData.folderId = validation.data.folderId;
    if (validation.data.isFavorite !== undefined) updateData.isFavorite = validation.data.isFavorite;
    
    let newVersionNumber = currentPromptData.versions;

    // If content is changing, create a new version
    if (validation.data.content && validation.data.content !== currentPromptData.content) {
        newVersionNumber = (currentPromptData.versions || 0) + 1; 
        updateData.versions = newVersionNumber; 

        const oldVersionData = {
            userId: decodedToken.uid,
            promptId: promptId, 
            versionNumber: currentPromptData.versions, 
            content: currentPromptData.content,
            timestamp: currentPromptData.updatedAt, 
        };
        await adminDb.collection('prompts').doc(promptId).collection('versions').doc(String(currentPromptData.versions)).set(oldVersionData);
    }


    await promptRef.update(updateData);
    
    const updatedDoc = await promptRef.get();
    const updatedPrompt = { id: updatedDoc.id, ...updatedDoc.data() } as FirebasePrompt;


    return NextResponse.json(updatedPrompt, { status: 200 });

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

    const versionsSnapshot = await promptRef.collection('versions').get();
    const batch = adminDb.batch();
    versionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    await promptRef.delete();

    return NextResponse.json({ message: 'Prompt and its versions deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting prompt:', error);
    return NextResponse.json({ error: 'Failed to delete prompt', details: error.message }, { status: 500 });
  }
}
