import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  
  // Clear both session and rbac cookies
  response.cookies.set("__session", "", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  
  response.cookies.set("__rbac", "", {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
