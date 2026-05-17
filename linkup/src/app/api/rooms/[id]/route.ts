import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Room from '@/models/Room';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = params;

    const room = await Room.findById(id);

    if (!room) {
      return NextResponse.json({
        success: false,
        error: "Room not found"
      }, { status: 404 });
    }

    // Check if room has expired (TTL dynamic fallback)
    if (room.expiresAt && new Date(room.expiresAt) < new Date()) {
      return NextResponse.json({
        success: false,
        error: "Room has expired"
      }, { status: 410 });
    }

    // Return room info safely, omitting hostToken
    const safeRoom = {
      id: room._id,
      name: room.name,
      maxParticipants: room.maxParticipants,
      participantCount: room.participantCount,
      settings: room.settings,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      hasPassword: !!room.password,
    };

    return NextResponse.json({
      success: true,
      room: safeRoom
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching room:', error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
