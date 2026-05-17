import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Room from '@/models/Room';

import { validateUUID } from '@/lib/validation';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = params;

    // Validate room ID parameter
    if (!id || !validateUUID(id)) {
      return NextResponse.json({
        success: false,
        error: "Invalid Room ID format"
      }, { status: 400 });
    }

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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = params;

    // Validate room ID parameter
    if (!id || !validateUUID(id)) {
      return NextResponse.json({
        success: false,
        error: "Invalid Room ID format"
      }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { key, value } = body;

    // Validate that the setting key is a valid room setting
    if (!['allowChat', 'allowScreenShare', 'waitingRoom'].includes(key)) {
      return NextResponse.json({
        success: false,
        error: "Invalid setting key"
      }, { status: 400 });
    }

    // Validate setting value is boolean
    if (typeof value !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: "Setting value must be a boolean"
      }, { status: 400 });
    }

    const room = await Room.findById(id);
    if (!room) {
      return NextResponse.json({
        success: false,
        error: "Room not found"
      }, { status: 404 });
    }

    // Verify host token from the Authorization header to authenticate the host
    const hostToken = req.headers.get("Authorization");
    if (!hostToken || hostToken !== room.hostToken) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized: only the room host can modify settings"
      }, { status: 403 });
    }

    // Dynamic field update
    room.settings = {
      ...room.settings,
      [key]: value
    };
    await room.save();

    return NextResponse.json({
      success: true,
      settings: room.settings
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error updating room settings:', error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
