import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Alumno",
      credentials: {
        carnet:   { label: "Carnet", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.carnet || !credentials?.password) return null;

        const alumno = await prisma.alumno.findUnique({
          where: { carnet: credentials.carnet },
          include: { carrera: true },
        });

        if (!alumno || !alumno.password) return null;

        const passwordMatch = await bcrypt.compare(credentials.password, alumno.password);
        if (!passwordMatch) return null;

        return {
          id:                  String(alumno.id),
          name:                `${alumno.nombre} ${alumno.apellido}`,
          email:               alumno.correoInstitucional ?? alumno.email,
          carnet:              alumno.carnet,
          carrera:             alumno.carrera?.nombre ?? null,
          correoInstitucional: alumno.correoInstitucional,
          role:                "ALUMNO",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.carnet              = user.carnet;
        token.carrera             = user.carrera;
        token.correoInstitucional = user.correoInstitucional;
        token.role                = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.carnet              = token.carnet;
      session.user.carrera             = token.carrera;
      session.user.correoInstitucional = token.correoInstitucional;
      session.user.role                = token.role;
      return session;
    },
  },
  pages: {
    signIn: "/alumno/login",
  },
  session: { strategy: "jwt" },
});

export { handler as GET, handler as POST };
