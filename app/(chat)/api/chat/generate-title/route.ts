import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/app/(auth)/auth';
import { updateChatTitle } from '@/db/queries';

import { generateChatTitle } from './utils';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, messages, database } = await req.json();
    
    // Generate title
    const title = await generateChatTitle(messages, database);
    
    // Update in database
    await updateChatTitle({
      id: chatId,
      title,
      userId: session.user.id
    });

    return NextResponse.json({ title });
  } catch (error) {
    console.error('Failed to generate title:', error);
    return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 });
  }
}