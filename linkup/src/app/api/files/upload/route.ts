import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import File from '@/models/File';

import Room from '@/models/Room';
import { validateUUID, sanitizeInput, validateBase64, validateMimeType } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const { roomId, fileName, fileSize, fileType, data } = body;

    if (!roomId || !fileName || !fileSize || !fileType || !data) {
      return NextResponse.json({
        success: false,
        error: "Missing required file upload parameters."
      }, { status: 400 });
    }

    // 1. Validate roomId format
    if (!validateUUID(roomId)) {
      return NextResponse.json({
        success: false,
        error: "Invalid Room ID format"
      }, { status: 400 });
    }

    // 2. Verify target room exists in MongoDB and hasn't expired
    const targetRoom = await Room.findById(roomId);
    if (!targetRoom) {
      return NextResponse.json({
        success: false,
        error: "Target room does not exist"
      }, { status: 404 });
    }
    if (targetRoom.expiresAt && new Date(targetRoom.expiresAt) < new Date()) {
      return NextResponse.json({
        success: false,
        error: "Target room has expired"
      }, { status: 410 });
    }

    // 3. Validate fileName
    if (typeof fileName !== 'string' || fileName.length > 255) {
      return NextResponse.json({
        success: false,
        error: "Invalid file name"
      }, { status: 400 });
    }
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json({
        success: false,
        error: "Directory traversal is strictly prohibited in file names"
      }, { status: 400 });
    }
    const sanitizedFileName = sanitizeInput(fileName);

    // 4. Validate fileType
    if (typeof fileType !== 'string' || !validateMimeType(fileType)) {
      return NextResponse.json({
        success: false,
        error: "Unsupported file type"
      }, { status: 400 });
    }

    // 5. Validate fileSize boundaries (capping files at 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    const parsedSize = parseInt(fileSize, 10);
    if (isNaN(parsedSize) || parsedSize <= 0 || parsedSize > MAX_SIZE) {
      return NextResponse.json({
        success: false,
        error: "File size exceeds the maximum limit of 10MB."
      }, { status: 400 });
    }

    // 6. Validate base64 payload integrity
    if (!validateBase64(data)) {
      return NextResponse.json({
        success: false,
        error: "Invalid base64 file data payload"
      }, { status: 400 });
    }

    const file = new File({
      roomId,
      fileName: sanitizedFileName,
      fileSize: parsedSize,
      fileType,
      data
    });

    await file.save();

    return NextResponse.json({
      success: true,
      fileId: file._id
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error uploading file:', error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
