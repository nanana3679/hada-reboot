import { getAuth } from "@/auth";

export async function GET(request: Request) {
  const { handlers } = await getAuth();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  const { handlers } = await getAuth();
  return handlers.POST(request);
}
