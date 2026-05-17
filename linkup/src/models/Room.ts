import mongoose, { Schema } from 'mongoose';

export interface IRoom {
  _id: string; // UUID string
  name?: string;
  hostToken: string;
  password?: string | null;
  createdAt: Date;
  expiresAt?: Date | null;
  maxParticipants: number;
  settings: {
    allowChat: boolean;
    allowScreenShare: boolean;
    waitingRoom: boolean;
  };
  participantCount: number;
}

const RoomSchema: Schema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: false },
  hostToken: { type: String, required: true },
  password: { type: String, required: false, default: null },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: false, default: null, index: { expires: 0 } },
  maxParticipants: { type: Number, default: 10 },
  settings: {
    allowChat: { type: Boolean, default: true },
    allowScreenShare: { type: Boolean, default: true },
    waitingRoom: { type: Boolean, default: true }
  },
  participantCount: { type: Number, default: 0 }
});

export default mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);
