export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';

const DEFAULT_TARIFFS = [
  { role: 'ADMIN',    hourly_rate: 0,  is_free: true,  max_free_hours: null },
  { role: 'TEACHER',  hourly_rate: 0,  is_free: true,  max_free_hours: 8    },
  { role: 'STUDENT',  hourly_rate: 5,  is_free: false, max_free_hours: null },
  { role: 'VISITOR',  hourly_rate: 10, is_free: false, max_free_hours: null },
  { role: 'SECURITY', hourly_rate: 0,  is_free: true,  max_free_hours: null },
];

async function ensureDefaults() {
  for (const t of DEFAULT_TARIFFS) {
    await prisma.tariffConfig.upsert({
      where: { role: t.role },
      update: {},
      create: t,
    });
  }
}

export async function GET() {
  try {
    await ensureDefaults();
    const tariffs = await prisma.tariffConfig.findMany({ orderBy: { role: 'asc' } });
    return res.ok(tariffs);
  } catch (e) {
    return res.error(e.message);
  }
}

export async function PATCH(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'ADMIN') return res.error('Solo ADMIN puede modificar tarifas', 403);

    const dto = await request.json();
    if (!dto.role) return res.error('Se requiere role');

    const updated = await prisma.tariffConfig.update({
      where: { role: dto.role },
      data: {
        hourly_rate:      dto.hourly_rate      ?? undefined,
        is_free:          dto.is_free          ?? undefined,
        max_free_hours:   dto.max_free_hours   !== undefined ? dto.max_free_hours : undefined,
        updated_by_user_id: user.sub,
      },
    });

    await prisma.auditLog.create({
      data: {
        user_id: user.sub,
        action: 'TARIFF_UPDATED',
        resource: 'tariff_config',
        resource_id: updated.id,
        metadata: { role: dto.role, hourly_rate: dto.hourly_rate, is_free: dto.is_free },
      },
    });

    return res.ok(updated, `Tarifa de ${dto.role} actualizada`);
  } catch (e) {
    return res.error(e.message);
  }
}
