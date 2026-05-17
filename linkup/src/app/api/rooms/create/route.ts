import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import Room from '@/models/Room';
import { generateHostToken } from '@/lib/auth';

import { sanitizeInput } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const { name, settings, maxParticipants, password, expiresAt } = body;

    // 1. Validate name
    let sanitizedName = "";
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return NextResponse.json({ success: false, error: "Room name must be a string" }, { status: 400 });
      }
      sanitizedName = sanitizeInput(name.trim());
      if (sanitizedName.length === 0) {
        return NextResponse.json({ success: false, error: "Room name cannot be empty" }, { status: 400 });
      }
      if (sanitizedName.length > 100) {
        return NextResponse.json({ success: false, error: "Room name cannot exceed 100 characters" }, { status: 400 });
      }
    }

    // 2. Validate maxParticipants
    let parsedMaxParticipants = 10;
    if (maxParticipants !== undefined) {
      const parsed = parseInt(maxParticipants, 10);
      if (isNaN(parsed) || parsed < 2 || parsed > 50) {
        return NextResponse.json({ success: false, error: "maxParticipants must be an integer between 2 and 50" }, { status: 400 });
      }
      parsedMaxParticipants = parsed;
    }

    // 3. Validate password length
    if (password !== undefined) {
      if (typeof password !== 'string') {
        return NextResponse.json({ success: false, error: "Password must be a string" }, { status: 400 });
      }
      if (password.length > 128) {
        return NextResponse.json({ success: false, error: "Password cannot exceed 128 characters" }, { status: 400 });
      }
    }

    // 4. Validate expiresAt
    let parsedExpiresAt = null;
    if (expiresAt !== undefined && expiresAt !== null) {
      const dateVal = new Date(expiresAt);
      if (isNaN(dateVal.getTime())) {
        return NextResponse.json({ success: false, error: "expiresAt must be a valid date" }, { status: 400 });
      }
      const now = new Date();
      if (dateVal <= now) {
        return NextResponse.json({ success: false, error: "expiresAt must be a future date" }, { status: 400 });
      }
      // Maximum expiration of 72 hours (3 days)
      const maxExpiry = new Date(now.getTime() + 72 * 60 * 60 * 1000);
      if (dateVal > maxExpiry) {
        return NextResponse.json({ success: false, error: "expiresAt cannot exceed 72 hours in the future" }, { status: 400 });
      }
      parsedExpiresAt = dateVal;
    }

    // 5. Validate settings flags
    if (settings !== undefined) {
      if (typeof settings !== 'object' || settings === null) {
        return NextResponse.json({ success: false, error: "Settings must be an object" }, { status: 400 });
      }
      const { allowChat, allowScreenShare, waitingRoom } = settings;
      if (allowChat !== undefined && typeof allowChat !== 'boolean') {
        return NextResponse.json({ success: false, error: "allowChat setting must be a boolean" }, { status: 400 });
      }
      if (allowScreenShare !== undefined && typeof allowScreenShare !== 'boolean') {
        return NextResponse.json({ success: false, error: "allowScreenShare setting must be a boolean" }, { status: 400 });
      }
      if (waitingRoom !== undefined && typeof waitingRoom !== 'boolean') {
        return NextResponse.json({ success: false, error: "waitingRoom setting must be a boolean" }, { status: 400 });
      }
    }

    const roomId = crypto.randomUUID();
    const hostToken = generateHostToken(roomId);

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const room = new Room({
      _id: roomId,
      name: sanitizedName || `Room-${roomId.slice(0, 8)}`,
      hostToken,
      password: hashedPassword,
      maxParticipants: parsedMaxParticipants,
      expiresAt: parsedExpiresAt,
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
