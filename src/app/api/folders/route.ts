import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import { verifyIdToken } from '@/lib/firebase/firebaseAdminAuth';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import type { FirebaseFolder } from '@/types/firebase.types';

export const createFolderSchema = z.object({
  name: z.string().min(1, "Folder name is required."),
  parentId: z.string().nullable().optional(), // null for root, or parent folder ID
});

export type FolderSchemaType = z.infer<typeof createFolderSchema>;

// GET all folders for the authenticated user
export async function GET(request: NextRequest) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const foldersSnapshot = await adminDb.collection('folders')
      .where('userId', '==', decodedToken.uid)
      .orderBy('name', 'asc')
      .get();
    
    const folders: FirebaseFolder[] = foldersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as FirebaseFolder;
    });

    return NextResponse.json(folders, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders', details: error.message }, { status: 500 });
  }
}

// POST a new folder
export async function POST(request: NextRequest) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = createFolderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const { name, parentId } = validation.data;
    const newFolderRef = adminDb.collection('folders').doc();
    const now = Timestamp.now();

    const folderData: Omit<FirebaseFolder, 'id'> = {
      userId: decodedToken.uid,
      name,
      parentId: parentId || null,
      createdAt: now,
      updatedAt: now,
    };

    await newFolderRef.set(folderData);
    
    return NextResponse.json({ id: newFolderRef.id, ...folderData }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder', details: error.message }, { status: 500 });
  }
}
