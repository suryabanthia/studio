// src/app/api/prompts/export/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import { verifyIdToken } from '@/lib/firebase/firebaseAdminAuth';
import type { FirebasePrompt } from '@/types/firebase.types';
import { Timestamp } from 'firebase-admin/firestore';


function promptsToJson(prompts: FirebasePrompt[]): string {
  const serializablePrompts = prompts.map(p => ({
    ...p,
    createdAt: p.createdAt instanceof Timestamp ? p.createdAt.toDate().toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Timestamp ? p.updatedAt.toDate().toISOString() : p.updatedAt,
  }));
  return JSON.stringify(serializablePrompts, null, 2);
}

function promptsToCsv(prompts: FirebasePrompt[]): string {
  if (prompts.length === 0) return '';

  const headers = ['id', 'name', 'content', 'folderId', 'isFavorite', 'versions', 'createdAt', 'updatedAt', 'userId'];
  const csvRows = [headers.join(',')];

  prompts.forEach(p => {
    const createdAt = p.createdAt instanceof Timestamp ? p.createdAt.toDate().toISOString() : p.createdAt;
    const updatedAt = p.updatedAt instanceof Timestamp ? p.updatedAt.toDate().toISOString() : p.updatedAt;
    const row = [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.content.replace(/"/g, '""').replace(/\n/g, '\\n')}"`,
      p.folderId || '',
      p.isFavorite.toString(),
      p.versions.toString(),
      createdAt,
      updatedAt,
      p.userId,
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

export async function GET(request: NextRequest) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = decodedToken.uid;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') as 'json' | 'csv' | null;

  if (!format || !['json', 'csv'].includes(format)) {
    return NextResponse.json({ error: 'Invalid or missing format parameter. Use "json" or "csv".' }, { status: 400 });
  }

  try {
    const promptsSnapshot = await adminDb.collection('prompts')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .get();
    
    const prompts: FirebasePrompt[] = promptsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure Timestamps from Firestore are correctly handled
        createdAt: data.createdAt, 
        updatedAt: data.updatedAt,
      } as FirebasePrompt;
    });

    let responseData: string;
    let contentType: string;

    if (format === 'json') {
      responseData = promptsToJson(prompts);
      contentType = 'application/json';
    } else { // csv
      responseData = promptsToCsv(prompts);
      contentType = 'text/csv';
    }

    return new NextResponse(responseData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="prompts.${format}"`,
      },
    });

  } catch (error: any) {
    console.error('Error exporting prompts:', error);
    return NextResponse.json({ error: 'Failed to export prompts', details: error.message }, { status: 500 });
  }
}
