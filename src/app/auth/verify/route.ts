import { NextResponse, type NextRequest } from "next/server";
import { redeemSignInToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const ok = token ? await redeemSignInToken(token) : false;
  return NextResponse.redirect(new URL(ok ? "/library" : "/login?expired=1", req.url));
}
