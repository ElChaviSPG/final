export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { signAccess, signRefresh, verifyRefresh, getUserFromRequest } from '@/lib/jwt';
import * as res from '@/lib/response';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'refresh') {
      const { refresh_token } = await request.json();
      try {
        const payload = verifyRefresh(refresh_token);
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || !user.is_active) return res.unauthorized('Usuario inactivo');
        const access_token = signAccess({ sub: user.id, email: user.email, role: user.role });
        return res.ok({ access_token }, 'Token renovado');
      } catch {
        return res.unauthorized('Refresh token inválido o expirado');
      }
    }

    if (action === 'logout') {
      const user = getUserFromRequest(request);
      if (user) {
        await prisma.auditLog.create({
          data: { user_id: user.sub, action: 'LOGOUT', resource: 'User', resource_id: user.sub },
        });
      }
      return res.ok(null, 'Sesión cerrada');
    }

    const { email, password } = await request.json();
    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser || !dbUser.is_active || dbUser.deleted_at)
      return res.unauthorized('Credenciales inválidas o usuario inactivo');

    const valid = await bcrypt.compare(password, dbUser.password_hash);
    if (!valid) return res.unauthorized('Credenciales inválidas');

    await prisma.user.update({ where: { id: dbUser.id }, data: { last_login_at: new Date() } });
    await prisma.auditLog.create({
      data: { user_id: dbUser.id, action: 'LOGIN', resource: 'User', resource_id: dbUser.id },
    });

    const payload = { sub: dbUser.id, email: dbUser.email, role: dbUser.role };
    return res.ok({
      access_token: signAccess(payload),
      refresh_token: signRefresh(payload),
      user: { id: dbUser.id, email: dbUser.email, role: dbUser.role, first_name: dbUser.first_name, last_name: dbUser.last_name },
    }, 'Login exitoso');
  } catch (e) {
    return res.error(e.message);
  }
}

export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return res.unauthorized();
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.sub },
      include: { vehicles: { where: { deleted_at: null } } },
    });
    const { password_hash: _, ...data } = dbUser;
    return res.ok(data, 'Perfil obtenido');
  } catch (e) {
    return res.error(e.message);
  }
}
