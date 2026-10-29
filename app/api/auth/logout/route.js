import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json(
    { message: "Logout realizado com sucesso" },
    { status: 200 }
  );

  response.cookies.set({
    name: "token",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
