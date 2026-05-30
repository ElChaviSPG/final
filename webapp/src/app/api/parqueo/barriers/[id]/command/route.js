export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';
import { barriers } from '../../route.js';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const user = getUserFromRequest(request);
    const { action, reason } = await request.json();
    const operator_id = user?.sub ?? null;

    const barrier = barriers.get(id);
    if (!barrier) return res.notFound('Barrera no encontrada');

    if (action === 'OPEN') { barrier.is_open = true; barrier.is_blocked = false; }
    else if (action === 'CLOSE') { barrier.is_open = false; }
    else if (action === 'BLOCK') { barrier.is_open = false; barrier.is_blocked = true; }

    barrier.last_action = action;
    barrier.last_action_at = new Date();

    await prisma.barrierLog.create({
      data: { barrier_id: id, action, trigger_source: 'MANUAL', operator_id, notes: reason },
    });

    return res.ok(barrier, `Barrera ${action.toLowerCase()}`);
  } catch (e) {
    return res.error(e.message);
  }
}
