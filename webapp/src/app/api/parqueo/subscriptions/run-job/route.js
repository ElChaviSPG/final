import * as res from '@/lib/response';
import { getUserFromRequest } from '@/lib/jwt';
import { expireSubscriptions, notifyExpiringSoon } from '@/lib/subscriptionJob';

// POST /api/parqueo/subscriptions/run-job
// Expira suscripciones vencidas, bloquea accesos y envía alertas de vencimiento próximo.
// Solo ADMIN puede dispararlo manualmente; también puede llamarlo un cron externo.
export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'ADMIN') return res.error('Solo ADMIN puede ejecutar este proceso', 403);

    const [expireResult, notifyResult] = await Promise.all([
      expireSubscriptions(),
      notifyExpiringSoon(3),
    ]);

    return res.ok({
      expired: expireResult.expired,
      renewed: expireResult.renewed,
      alerts_sent: notifyResult.notified,
    }, `Job completado: ${expireResult.expired} vencidas, ${expireResult.renewed} renovadas, ${notifyResult.notified} alertas enviadas`);
  } catch (e) {
    return res.error(e.message);
  }
}
