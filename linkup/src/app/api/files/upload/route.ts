import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import File from '@/models/File';

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

    // Capping files at 10MB to avoid BSON payload limit (16MB) in MongoDB base64 strings
    const MAX_SIZE = 10 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      return NextResponse.json({
        success: false,
        error: "File size exceeds the maximum limit of 10MB."
      }, { status: 400 });
    }

    const file = new File({
      roomId,
      fileName,
      fileSize,
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
