import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { D1Adapter } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getAuth() {
  const { env } = await getCloudflareContext({ async: true });
  return NextAuth({
    secret: env.AUTH_SECRET,
    providers: [
      Google({
        clientId: env.AUTH_GOOGLE_ID,
        clientSecret: env.AUTH_GOOGLE_SECRET,
      }),
    ],
    adapter: D1Adapter(env.DB),
    trustHost: true,
  });
}
