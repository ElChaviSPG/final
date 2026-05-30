export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !['ADMIN', 'SECURITY'].includes(user.role)) return res.error('No autorizado', 403);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const [total, data] = await Promise.all([
      prisma.cardReplacement.count(),
      prisma.cardReplacement.findMany({
        skip: (page - 1) * limit, take: limit,
        include: {
          user: { select: { id: true, first_name: true, last_name: true, carnet: true } },
          processed_by: { select: { id: true, first_name: true, last_name: true } },
        },
        orderBy: { requested_at: 'desc' },
      }),
    ]);

    return res.ok({ total, page, limit, data });
  } catch (e) {
    return res.error(e.message);
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !['ADMIN', 'SECURITY'].includes(user.role)) return res.error('No autorizado', 403);

    const dto = await request.json();
    if (!dto.user_id || !dto.reason) return res.error('Se requieren user_id y reason');

    const target = await prisma.user.findUnique({ where: { id: dto.user_id } });
    if (!target) return res.notFound('Usuario no encontrado');

    if (dto.reason === 'REASSIGNMENT' && dto.old_nfc_token) {
      const prev = await prisma.user.findFirst({ where: { nfc_card_id: dto.old_nfc_token } });
      if (prev && prev.id !== dto.user_id) {
        await prisma.user.update({ where: { id: prev.id }, data: { nfc_card_id: null } });
      }
    }

    const ops = [
      prisma.user.update({
        where: { id: dto.user_id },
        data: { nfc_card_id: dto.new_nfc_token ?? null },
      }),
      prisma.cardReplacement.create({
        data: {
          user_id: dto.user_id,
          old_nfc_token: dto.old_nfc_token ?? target.nfc_card_id ?? null,
          new_nfc_token: dto.new_nfc_token ?? null,
          reason: dto.reason,
          replacement_fee: dto.reason === 'REASSIGNMENT' ? 0 : 50,
          fee_paid: dto.reason === 'REASSIGNMENT',
          processed_at: new Date(),
          processed_by_user_id: user.sub,
          notes: dto.notes ?? null,
        },
      }),
      prisma.auditLog.create({
        data: {
          user_id: user.sub,
          action: 'CARD_REPLACED',
          resource: 'user',
          resource_id: dto.user_id,
          metadata: { reason: dto.reason, new_nfc_token: dto.new_nfc_token },
        },
      }),
    ];

    const [, replacement] = await prisma.$transaction(ops);
    return res.created(replacement, 'Tarjeta repuesta correctamente');
  } catch (e) {
    return res.error(e.message);
  }
}
