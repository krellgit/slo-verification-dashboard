import { NextResponse } from 'next/server';
import { mockVerificationPass, mockVerificationFail } from '@/lib/mockData';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // Return mock data based on runId
  if (runId === 'VR-20260114-002') {
    return NextResponse.json(mockVerificationFail);
  }

  return NextResponse.json(mockVerificationPass);
}
