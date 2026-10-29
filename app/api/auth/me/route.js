import { NextResponse } from "next/server";
import { guard } from "@/lib/auth";

export async function GET(req) {
  const auth = await guard(req);
  if (auth.error) {
    return auth.error;
  }

  const { id, nome, role } = auth.user;

  return NextResponse.json({ id, nome, role }, { status: 200 });
}
