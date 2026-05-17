import mongoose, { Schema, Document } from 'mongoose';

export interface IFile extends Document {
  roomId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  data: string; // base64 string payload
  createdAt: Date;
}

const FileSchema: Schema = new Schema({
  roomId: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  data: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: { expires: '24h' } } // 24-hour TTL auto-expiration
});

export default mongoose.models.File || mongoose.model<IFile>('File', FileSchema);
