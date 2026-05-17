import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import Room from '@/models/Room';

import { validateUUID } from '@/lib/validation';

export async function POST(
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
    const { password } = body;

    if (!password) {
      return NextResponse.json({
        success: false,
        error: "Password is required"
      }, { status: 400 });
    }

    if (typeof password !== 'string') {
      return NextResponse.json({
        success: false,
        error: "Password must be a string"
      }, { status: 400 });
    }

    if (password.length > 128) {
      return NextResponse.json({
        success: false,
        error: "Password cannot exceed 128 characters"
      }, { status: 400 });
    }

    const room = await Room.findById(id);

    if (!room) {
      return NextResponse.json({
        success: false,
        error: "Room not found"
      }, { status: 404 });
    }

    if (!room.password) {
      return NextResponse.json({
        success: true,
        message: "Room is not password-protected"
      }, { status: 200 });
    }

    const isMatch = await bcrypt.compare(password, room.password);

    if (!isMatch) {
      return NextResponse.json({
        success: false,
        error: "Incorrect password"
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: "Password verified successfully"
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error verifying room password:', error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
