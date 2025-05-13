import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import { verifyIdToken } from '@/lib/firebase/firebaseAdminAuth';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import type { FirebaseFolder } from '@/types/firebase.types';

const updateFolderSchema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
});

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
    
    // Prevent moving folder into itself or its descendants (complex check, simplified here)
    if (validation.data.parentId === folderId) {
        return NextResponse.json({ error: 'Cannot move a folder into itself.' }, { status: 400 });
    }


    const updateData: Partial<FirebaseFolder> & { updatedAt: Timestamp } = {
        ...validation.data,
        updatedAt: Timestamp.now(),
    };
    
    // If parentId is explicitly set to undefined by client, it means no change to parentId.
    // If parentId is null, it's moving to root.
    if (validation.data.parentId === undefined) {
      delete updateData.parentId;
    }


    await folderRef.update(updateData);
    return NextResponse.json({ id: folderId, ...updateData }, { status: 200 });

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

    // Check if folder has child prompts or folders (simplified check)
    // A more robust check would query prompts where folderId == folderId and folders where parentId == folderId
    const childPrompts = await adminDb.collection('prompts').where('userId', '==', decodedToken.uid).where('folderId', '==', folderId).limit(1).get();
    const childFolders = await adminDb.collection('folders').where('userId', '==', decodedToken.uid).where('parentId', '==', folderId).limit(1).get();

    if (!childPrompts.empty || !childFolders.empty) {
      return NextResponse.json({ error: 'Folder is not empty. Delete or move its contents first.' }, { status: 400 });
    }

    await folderRef.delete();
    return NextResponse.json({ message: 'Folder deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder', details: error.message }, { status: 500 });
  }
}
