import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db';
import Room from '@/models/Room';
import { generateHostToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const { name, settings, maxParticipants, password, expiresAt } = body;

    const roomId = crypto.randomUUID();
    const hostToken = generateHostToken(roomId);

    const room = new Room({
      _id: roomId,
      name: name || `Room-${roomId.slice(0, 8)}`,
      hostToken,
      password: password || null,
      maxParticipants: maxParticipants || 10,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      settings: {
        allowChat: settings?.allowChat ?? true,
        allowScreenShare: settings?.allowScreenShare ?? true,
        waitingRoom: settings?.waitingRoom ?? false,
      },
    });

    await room.save();

    return NextResponse.json({
      success: true,
      roomId,
      hostToken,
      roomUrl: `${req.headers.get('origin') || ''}/room/${roomId}`,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating room:', error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
