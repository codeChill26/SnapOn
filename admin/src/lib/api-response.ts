import { NextResponse } from 'next/server';

/**
 * BigInt JSON Serializer Replacer
 * Converts native BigInt values (e.g. order_code in WalletTransaction) to strings
 * to prevent 'TypeError: Do not know how to serialize a BigInt' in Next.js API responses.
 */
function bigIntReplacer(_key: string, value: any) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

export function successResponse(data: any = null, message: string = 'Success', status: number = 200) {
  const jsonBody = JSON.stringify(
    {
      success: true,
      message,
      data,
    },
    bigIntReplacer
  );

  return new NextResponse(jsonBody, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string = 'Error', status: number = 400, data: any = null) {
  const jsonBody = JSON.stringify(
    {
      success: false,
      message,
      data,
    },
    bigIntReplacer
  );

  return new NextResponse(jsonBody, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
