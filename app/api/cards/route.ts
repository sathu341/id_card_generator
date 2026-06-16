import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Card } from '@/models/Card';

export async function GET() {
  try {
    await connectDB();
    const cards = await Card.find({}).sort({ rowIndex: 1 }).lean();
    return NextResponse.json({ cards });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
