// src/app/api/prompts/import/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import { verifyIdToken } from '@/lib/firebase/firebaseAdminAuth';
import { Timestamp } from 'firebase-admin/firestore';
import type { FirebasePrompt } from '@/types/firebase.types';

interface ImportedPromptData {
  name: string;
  content: string;
  folderId?: string | null;
  isFavorite?: boolean;
  [key: string]: any;
}

async function parseJsonFile(file: File): Promise<ImportedPromptData[]> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!Array.isArray(data)) {
    throw new Error('Invalid JSON format: Expected an array of prompts.');
  }
  data.forEach((prompt, index) => {
    if (!prompt.name || typeof prompt.name !== 'string' || !prompt.content || typeof prompt.content !== 'string') {
      throw new Error(`Invalid prompt data at index ${index}: 'name' and 'content' are required and must be strings.`);
    }
  });
  return data as ImportedPromptData[];
}

async function parseCsvFile(file: File): Promise<ImportedPromptData[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV file must have a header and at least one data row.');

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const nameIndex = header.indexOf('name');
  const contentIndex = header.indexOf('content');
  const folderIdIndex = header.indexOf('folderid');
  const isFavoriteIndex = header.indexOf('isfavorite');

  if (nameIndex === -1 || contentIndex === -1) {
    throw new Error('CSV file must contain "name" and "content" columns.');
  }

  const prompts: ImportedPromptData[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const values = lines[i].split(','); 

    const name = values[nameIndex]?.trim();
    const content = values[contentIndex]?.trim();

    if (!name || !content) {
        console.warn(`Skipping row ${i+1} due to missing name or content.`);
        continue;
    }
    
    const promptData: ImportedPromptData = { name, content };
    if (folderIdIndex !== -1 && values[folderIdIndex]?.trim()) {
      promptData.folderId = values[folderIdIndex].trim();
    }
    if (isFavoriteIndex !== -1 && values[isFavoriteIndex]?.trim()) {
      promptData.isFavorite = values[isFavoriteIndex].trim().toLowerCase() === 'true';
    }
    prompts.push(promptData);
  }
  return prompts;
}


export async function POST(request: NextRequest) {
  const decodedToken = await verifyIdToken(request);
  if (!decodedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = decodedToken.uid;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    let promptsToImport: ImportedPromptData[];
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      promptsToImport = await parseJsonFile(file);
    } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      promptsToImport = await parseCsvFile(file);
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please use JSON or CSV.' }, { status: 400 });
    }

    if (promptsToImport.length === 0) {
      return NextResponse.json({ error: 'No prompts found in the file to import.' }, { status: 400 });
    }
    
    const batch = adminDb.batch();
    let importedCount = 0;

    for (const p of promptsToImport) {
      const newPromptRef = adminDb.collection('prompts').doc();
      const now = Timestamp.now();
      const promptData: Omit<FirebasePrompt, 'id'> = {
        userId,
        name: p.name,
        content: p.content,
        folderId: p.folderId || null,
        createdAt: now,
        updatedAt: now,
        versions: 1,
        isFavorite: p.isFavorite || false,
      };
      batch.set(newPromptRef, promptData);
      importedCount++;
    }

    await batch.commit();

    return NextResponse.json({ count: importedCount }, { status: 200 });

  } catch (error: any) {
    console.error('Error importing prompts:', error);
    let errorMessage = 'Failed to import prompts.';
    if (error.message.startsWith('Invalid JSON format') || error.message.startsWith('CSV file must') || error.message.startsWith('Invalid prompt data')) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage, details: error.message }, { status: 500 });
  }
}
