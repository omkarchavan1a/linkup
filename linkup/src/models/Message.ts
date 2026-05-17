import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  roomId: string;
  senderName: string;
  content: string;
  type: 'text' | 'file' | 'reaction';
  createdAt: Date;
}

const MessageSchema: Schema = new Schema({
  roomId: { type: String, required: true, index: true },
  senderName: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'file', 'reaction'], default: 'text' },
  createdAt: { type: Date, default: Date.now, index: { expires: '7d' } }
});

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
