import { NextResponse } from 'next/server';
import { mockVerificationPass, mockVerificationFail } from '@/lib/mockData';
import { verify } from '@/lib/verificationEngine';
import { VerificationInput } from '@/lib/inputTypes';

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

export async function POST(request: Request) {
  try {
    const input: VerificationInput = await request.json();

    // Validate required fields
    if (!input.asin || !input.product_name) {
      return NextResponse.json(
        { error: 'Missing required fields: asin and product_name are required' },
        { status: 400 }
      );
    }

    // Run verification
    const result = verify(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Verification error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error during verification' },
      { status: 500 }
    );
  }
}
