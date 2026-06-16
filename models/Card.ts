import mongoose, { Schema, Document } from 'mongoose';

export interface ICard extends Document {
  rowIndex: number;
  data: Record<string, string>;
  templateId: string;
  generatedAt?: Date;
}

const CardSchema = new Schema<ICard>(
  {
    rowIndex: Number,
    data: { type: Map, of: String },
    templateId: String,
    generatedAt: Date,
  },
  { timestamps: true }
);

export const Card = mongoose.models.Card || mongoose.model<ICard>('Card', CardSchema);
