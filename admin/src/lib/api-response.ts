import { NextResponse } from 'next/server';

export function successResponse(data: any = null, message: string = 'Success', status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

export function errorResponse(message: string = 'Error', status: number = 400, data: any = null) {
  return NextResponse.json(
    {
      success: false,
      message,
      data,
    },
    { status }
  );
}
