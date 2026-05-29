import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const role = searchParams.get('role');
  const is_active = searchParams.get('is_active');

  const search = searchParams.get('search');

  try {
    const where = { deleted_at: null };
    if (role) where.role = role;
    if (is_active !== null && is_active !== undefined) where.is_active = is_active === 'true';
    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name:  { contains: search, mode: 'insensitive' } },
        { email:      { contains: search, mode: 'insensitive' } },
        { carnet:     { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where, skip: (page - 1) * limit, take: limit,
        select: { id: true, email: true, first_name: true, last_name: true, role: true, carnet: true, phone: true, nfc_card_id: true, is_active: true, last_login_at: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    return res.ok({ total, page, limit, data: users });
  } catch (e) {
    return res.error(e.message);
  }
}

export async function POST(request) {
  try {
    const dto = await request.json();
    const exists = await prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) return res.conflict('El correo ya está registrado');

    // Verificar carnet/código en sistema académico del Grupo 1
    if (dto.carnet && (dto.role === 'STUDENT' || dto.role === 'TEACHER')) {
      try {
        const baseUrl = process.env.SISTEMA_ACADEMICO_URL ?? 'https://final-blond-ten.vercel.app';
        const verif = await fetch(`${baseUrl}/api/sistema-academico/verificar-usuario?id=${encodeURIComponent(dto.carnet)}`);
        if (verif.ok) {
          const body = await verif.json();
          // Only reject when the system explicitly says not found/not active.
          // Treat unknown response shapes as "allow" to avoid false-blocking.
          if (body.found === false) return res.error('El carnet no existe en el sistema académico', 422);
          if (body.activo === false) return res.error('El usuario no está activo en el sistema académico', 422);
        }
      } catch {
        // Si el sistema académico no responde, se permite el registro (no bloquear por fallo externo)
      }
    }

    const password_hash = await bcrypt.hash(dto.password, 12);
    const qr_code = `USP-QR-${uuid()}-${Date.now()}`;
    const { password, ...rest } = dto;
    const user = await prisma.user.create({ data: { ...rest, password_hash, qr_code } });
    const { password_hash: _, ...data } = user;
    return res.created(data, 'Usuario creado');
  } catch (e) {
    return res.error(e.message);
  }
}
