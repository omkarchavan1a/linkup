import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipant extends Document {
  roomId: string;
  socketId: string;
  displayName: string;
  joinedAt: Date;
  isHost: boolean;
  status: 'online' | 'away' | 'in-meeting';
}

const ParticipantSchema: Schema = new Schema({
  roomId: { type: String, required: true, index: true },
  socketId: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now, index: { expires: '1h' } },
  isHost: { type: Boolean, default: false },
  status: { type: String, enum: ['online', 'away', 'in-meeting'], default: 'online' }
});

export default mongoose.models.Participant || mongoose.model<IParticipant>('Participant', ParticipantSchema);
