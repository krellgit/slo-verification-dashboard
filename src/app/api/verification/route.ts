import { NextResponse } from 'next/server';
import { mockVerificationPass, mockVerificationFail } from '@/lib/mockData';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scenario = searchParams.get('scenario') || 'pass';

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  if (scenario === 'fail') {
    return NextResponse.json(mockVerificationFail);
  }

  return NextResponse.json(mockVerificationPass);
}
