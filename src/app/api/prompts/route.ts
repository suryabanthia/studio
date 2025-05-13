import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import { verifyIdToken } from '@/lib/firebase/firebaseAdminAuth';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import type { FirebasePrompt } from '@/types/firebase.types';

const createPromptSchema = z.object({
  name: z.string().min(1, "Prompt name is required."),
  content: z.string().min(1, "Prompt content is required."),
  folderId: z.string().nullable().optional(), // null for root, or folder ID
  isFavorite: z.boolean().optional().default(false),
});

export type PromptSchemaType = z.infer<typeof createPromptSchema>;


// GET all prompts for the authenticated user
export async function GET(request: NextRequest) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const promptsSnapshot = await adminDb.collection('prompts')
      .where('userId', '==', decodedToken.uid)
      .orderBy('updatedAt', 'desc')
      .get();
    
    const prompts: FirebasePrompt[] = promptsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt, 
        updatedAt: data.updatedAt,
      } as FirebasePrompt;
    });

    return NextResponse.json(prompts, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({ error: 'Failed to fetch prompts', details: error.message }, { status: 500 });
  }
}

// POST a new prompt
export async function POST(request: NextRequest) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = createPromptSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const { name, content, folderId, isFavorite } = validation.data;
    const newPromptRef = adminDb.collection('prompts').doc();
    const now = Timestamp.now();

    const promptData: Omit<FirebasePrompt, 'id'> = {
      userId: decodedToken.uid,
      name,
      content,
      folderId: folderId || null,
      createdAt: now,
      updatedAt: now,
      versions: 1, // Initial version number is 1
      isFavorite: isFavorite || false,
    };

    await newPromptRef.set(promptData);

    // The "current" content (version 1) is on the prompt document itself.
    // The 'versions' subcollection stores *previous* versions.
    // So, for a new prompt, there are no entries in the 'versions' subcollection yet.
    // Only when the prompt is updated (and its content changes), the *then-current* content
    // will be moved to the 'versions' subcollection.
    
    return NextResponse.json({ id: newPromptRef.id, ...promptData }, { status: 201 });

  } catch (error: any) {
