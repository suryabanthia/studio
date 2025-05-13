import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import { verifyIdToken } from '@/lib/firebase/firebaseAdminAuth';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import type { FirebaseFolder } from '@/types/firebase.types';

export const updateFolderSchema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
});
export type UpdateFolderPayload = z.infer<typeof updateFolderSchema>;

// GET a specific folder
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const folderId = params.id;
    const folderDoc = await adminDb.collection('folders').doc(folderId).get();

    if (!folderDoc.exists) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const folderData = folderDoc.data() as FirebaseFolder;
    if (folderData.userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ id: folderDoc.id, ...folderData }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching folder:', error);
    return NextResponse.json({ error: 'Failed to fetch folder', details: error.message }, { status: 500 });
  }
}

// PUT (update) a specific folder
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const folderId = params.id;
    const body = await request.json();
    const validation = updateFolderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const folderRef = adminDb.collection('folders').doc(folderId);
    const folderSnapshot = await folderRef.get();

    if (!folderSnapshot.exists) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    if (folderSnapshot.data()?.userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (validation.data.parentId === folderId) {
        return NextResponse.json({ error: 'Cannot move a folder into itself.' }, { status: 400 });
    }

    const updateData: any = { 
        updatedAt: Timestamp.now(),
    };
     if (validation.data.name !== undefined) updateData.name = validation.data.name;
     if (validation.data.parentId !== undefined) updateData.parentId = validation.data.parentId;


    await folderRef.update(updateData);
    const updatedDoc = await folderRef.get();
    return NextResponse.json({ id: updatedDoc.id, ...updatedDoc.data() }, { status: 200 });

  } catch (error: any) {
    console.error('Error updating folder:', error);
    return NextResponse.json({ error: 'Failed to update folder', details: error.message }, { status: 500 });
  }
}

// DELETE a specific folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const folderId = params.id;
    const folderRef = adminDb.collection('folders').doc(folderId);
    const folderSnapshot = await folderRef.get();

    if (!folderSnapshot.exists) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    if (folderSnapshot.data()?.userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const childPromptsQuery = adminDb.collection('prompts').where('userId', '==', decodedToken.uid).where('folderId', '==', folderId).limit(1);
    const childFoldersQuery = adminDb.collection('folders').where('userId', '==', decodedToken.uid).where('parentId', '==', folderId).limit(1);

    const [childPromptsSnapshot, childFoldersSnapshot] = await Promise.all([
      childPromptsQuery.get(),
      childFoldersQuery.get()
    ]);

    if (!childPromptsSnapshot.empty || !childFoldersSnapshot.empty) {
      return NextResponse.json({ error: 'Folder is not empty. Delete or move its contents first.' }, { status: 400 });
    }

    await folderRef.delete();
    return NextResponse.json({ message: 'Folder deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder', details: error.message }, { status: 500 });
  }
}
