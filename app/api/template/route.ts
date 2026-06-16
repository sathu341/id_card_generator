import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Template } from '@/models/Template';

export async function GET() {
  try {
    await connectDB();
    const templates = await Template.find({}).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { _id, ...data } = body;

    let template;
    if (_id) {
      template = await Template.findByIdAndUpdate(_id, data, { new: true });
    } else {
      template = await Template.create(data);
    }

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await Template.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
