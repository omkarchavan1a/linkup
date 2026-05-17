import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import File from '@/models/File';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = params;

    const file = await File.findById(id);

    if (!file) {
      return NextResponse.json({
        success: false,
        error: "File not found or has expired."
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      file: {
        roomId: file.roomId,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        data: file.data, // base64 string
        createdAt: file.createdAt
      }
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching file:', error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
