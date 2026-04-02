import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const runtime = "nodejs";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt" as const,
    
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      await connectDB();

      const existingUser = await User.findOne({ email: user.email });

      if (!existingUser) {
        await User.create({
          name: user.name,
          email: user.email,
          image: user.image,
        });
      }

      return true;
    },

    async jwt({ token, user }) {
    if (user) {
      token.email = user.email;
      token.name = user.name;
      token.image = user.image;
    }
    return token;
  },

  async session({ session, token }) {
    if (token) {
      session.user = {
        name: token.name as string | undefined,
        email: token.email as string | undefined,
        image: token.image as string | null | undefined,
      };
    }
    return session;
  }
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
