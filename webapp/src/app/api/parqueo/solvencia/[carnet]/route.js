export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';

export async function GET(request, { params }) {
  try {
    const { carnet } = await params;

    const user = await prisma.user.findFirst({
      where: { carnet, deleted_at: null },
      select: { id: true, first_name: true, last_name: true, role: true, is_active: true },
    });

    if (!user) {
      return res.ok({
        carnet,
        al_dia: false,
        razon: 'carnet_no_registrado',
        tiene_suscripcion_activa: false,
        suscripcion: null,
        deuda_pendiente: 0,
        sesiones_sin_pagar: 0,
        ultima_actividad: null,
      });
    }

    const now = new Date();

    const [suscripcion, sesionesSinPagar, ultimaSesion] = await Promise.all([
      prisma.parkingSubscription.findFirst({
        where: { user_id: user.id, status: 'ACTIVE', end_date: { gt: now } },
        orderBy: { end_date: 'desc' },
      }),
      prisma.parkingSession.findMany({
        where: { user_id: user.id, is_paid: false, status: 'COMPLETED' },
        select: { amount_due: true },
      }),
      prisma.parkingSession.findFirst({
        where: { user_id: user.id },
        orderBy: { entry_time: 'desc' },
        select: { entry_time: true },
      }),
    ]);

    const deuda_pendiente = sesionesSinPagar.reduce((sum, s) => sum + (s.amount_due ?? 0), 0);
    const al_dia = deuda_pendiente === 0;

    let suscripcionData = null;
    if (suscripcion) {
      const dias_restantes = Math.max(0, Math.ceil((suscripcion.end_date - now) / 86400000));
      suscripcionData = {
        type: suscripcion.type,
        vence: suscripcion.end_date.toISOString(),
        dias_restantes,
      };
    }

    return res.ok({
      carnet,
      usuario: { nombre: `${user.first_name} ${user.last_name}`, rol: user.role },
      al_dia,
      tiene_suscripcion_activa: !!suscripcion,
      suscripcion: suscripcionData,
      deuda_pendiente: parseFloat(deuda_pendiente.toFixed(2)),
      sesiones_sin_pagar: sesionesSinPagar.length,
      ultima_actividad: ultimaSesion?.entry_time ?? null,
    });
  } catch (e) {
    return res.error(e.message);
  }
}
