import mongoose, { Schema, Document } from 'mongoose';

export interface FieldConfig {
  id: string;
  key: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: string;
  color: string;
  align: string;
  visible: boolean;
  isPhoto: boolean;
  fontFamily: string;
  textTransform: string;
  backgroundColor: string;
  borderRadius: number;
  padding: number;
}

export interface ITemplate extends Document {
  name: string;
  backgroundImage: string; // base64 or URL
  backgroundImageName: string;
  canvasWidth: number;
  canvasHeight: number;
  fields: FieldConfig[];
  createdAt: Date;
  updatedAt: Date;
}

const FieldSchema = new Schema<FieldConfig>({
  id: String,
  key: String,
  label: String,
  x: Number,
  y: Number,
  width: Number,
  height: Number,
  fontSize: Number,
  fontWeight: String,
  color: String,
  align: String,
  visible: Boolean,
  isPhoto: Boolean,
  fontFamily: String,
  textTransform: String,
  backgroundColor: String,
  borderRadius: Number,
  padding: Number,
});

const TemplateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true, default: 'My Template' },
    backgroundImage: { type: String, default: '' },
    backgroundImageName: { type: String, default: '' },
    canvasWidth: { type: Number, default: 400 },
    canvasHeight: { type: Number, default: 250 },
    fields: [FieldSchema],
  },
  { timestamps: true }
);

export const Template =
  mongoose.models.Template || mongoose.model<ITemplate>('Template', TemplateSchema);
