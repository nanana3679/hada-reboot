import { NextRequest } from "next/server";
import { getAuth } from "@/auth";

export async function GET(request: NextRequest) {
  const { handlers } = await getAuth();
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  const { handlers } = await getAuth();
  return handlers.POST(request);
}
