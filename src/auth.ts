import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { D1Adapter } from "@auth/d1-adapter";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const authResult = async () => {
  const { env } = await getCloudflareContext({ async: true });
  return NextAuth({
    providers: [Google],
    adapter: D1Adapter(env.DB),
  });
};

export const { handlers, signIn, signOut, auth } = await authResult();
