"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

const TYPE_MAP = {
  PAYMENT_REQUIRED: { label: "Pago pendiente",    cls: "badge-danger",   icon: "fa-exclamation-circle" },
  PAYMENT_REMINDER: { label: "Recordatorio pago", cls: "badge-warning",  icon: "fa-money"        },
  PAYMENT_CONFIRMED:{ label: "Pago confirmado",   cls: "badge-success",  icon: "fa-check-circle"  },
  SESSION_START:    { label: "Entrada",            cls: "badge-info",     icon: "fa-sign-in"       },
  SESSION_END:      { label: "Salida",             cls: "badge-default",  icon: "fa-sign-out"      },
  RESERVATION:      { label: "Reserva",            cls: "badge-primary",  icon: "fa-calendar"      },
  ALERT:            { label: "Alerta",             cls: "badge-danger",   icon: "fa-exclamation"   },
  SYSTEM:           { label: "Sistema",            cls: "badge-secondary",icon: "fa-cog"           },
};

const fmt = (d) =>
  d ? new Date(d).toLocaleString("es-GT", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }) : "—";

function TypeBadge({ type }) {
  const t = TYPE_MAP[type] || { label: type, cls: "badge-secondary", icon: "fa-bell" };
  return <span className={`badge ${t.cls}`}><i className={`fa ${t.icon}`} style={{ marginRight:4 }} />{t.label}</span>;
}

// ── Modal: notificar deudores ─────────────────────────────────────────────────
function NotificarDeudoresModal({ onClose, onDone }) {
  const [deudores, setDeudores] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [result,   setResult]   = useState(null);

  useEffect(() => {
    // Buscar sesiones completadas sin pagar
    api.get("/sessions/history", { params: { limit: 100 } })
      .then(r => {
        const all = r.data?.data?.data || [];
        const pendientes = all.filter(s => !s.is_paid && s.amount_due > 0 && s.user);
        // Deduplicar por usuario
        const seen = new Set();
        const uniq = pendientes.filter(s => {
          if (seen.has(s.user_id)) return false;
          seen.add(s.user_id);
          return true;
        });
        setDeudores(uniq);
      })
      .catch(() => setDeudores([]))
      .finally(() => setLoading(false));
  }, []);

  const enviar = async () => {
    setSending(true);
    let ok = 0, fail = 0;
    for (const s of deudores) {
      try {
        await api.post("/notifications", {
          user_id: s.user_id,
          type:    "PAYMENT_REMINDER",
          title:   "Pago pendiente de parqueo",
          message: `Tienes un pago pendiente de Q${(s.amount_due ?? 0).toFixed(2)} por tu sesión del ${fmt(s.exit_time)}. Por favor regulariza tu deuda.`,
          metadata: { session_id: s.id, amount: s.amount_due },
        });
        ok++;
      } catch {
        fail++;
      }
    }
    setResult({ ok, fail });
    setSending(false);
  };

  return (
    <div className="modal" style={{ display:"flex", position:"fixed", inset:0, zIndex:1070,
      background:"rgba(0,0,0,0.65)", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:12, width:"100%", maxWidth:500,
        padding:28, boxShadow:"0 8px 32px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <i className="fa fa-exclamation-triangle" style={{ color:"#fbbd08", fontSize:20 }} />
          <span style={{ fontWeight:700, fontSize:17, color:"#800020" }}>Notificar deudores</span>
          <button style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1, padding:"0 0 0 12px", fontWeight:300 }} onClick={onClose}>&times;</button>
        </div>

        {result ? (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <i className="fa fa-check-circle" style={{ fontSize:48, color:"#21ba45" }} />
            <div style={{ marginTop:12, fontWeight:700, fontSize:18 }}>Notificaciones enviadas</div>
            <div style={{ color:"#7d8490", marginTop:6 }}>
              <span style={{ color:"#21ba45", fontWeight:700 }}>{result.ok}</span> enviadas
              {result.fail > 0 && <span style={{ color:"#db2828", fontWeight:700, marginLeft:8 }}>{result.fail} fallidas</span>}
            </div>
            <button className="btn btn-sm btn-danger" style={{ marginTop:20, background:"#800020", borderColor:"#800020" }}
              onClick={() => { onDone(); onClose(); }}>
              Cerrar
            </button>
          </div>
        ) : loading ? (
          <div className="text-center" style={{ padding:"2rem", color:"#7d8490" }}>
            <i className="fa fa-spinner fa-spin" style={{ marginRight:8 }} />Buscando sesiones pendientes…
          </div>
        ) : deudores.length === 0 ? (
          <div className="text-center" style={{ padding:"2rem" }}>
            <i className="fa fa-check-circle fa-2x" style={{ color:"#21ba45", display:"block", marginBottom:8 }} />
            <strong>No hay deudores pendientes</strong>
            <div style={{ color:"#7d8490", marginTop:6, fontSize:13 }}>Todos los usuarios tienen sus pagos al día.</div>
            <button className="btn btn-sm btn-default" style={{ marginTop:16 }} onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <>
            <div style={{ background:"#fff8e1", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13 }}>
              <i className="fa fa-info-circle" style={{ color:"#fbbd08", marginRight:6 }} />
              Se enviará una notificación de recordatorio a <strong>{deudores.length} usuario(s)</strong> con pagos pendientes.
            </div>

            <div style={{ maxHeight:220, overflowY:"auto", marginBottom:16 }}>
              <table className="table table-sm">
                <thead><tr>
                  <th style={{ fontSize:11 }}>Usuario</th>
                  <th style={{ fontSize:11 }}>Monto</th>
                  <th style={{ fontSize:11 }}>Fecha salida</th>
                </tr></thead>
                <tbody>
                  {deudores.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontSize:12 }}>
                        {s.user ? `${s.user.first_name} ${s.user.last_name}` : "—"}
                        <div style={{ color:"#7d8490", fontSize:11 }}>{s.user?.email}</div>
                      </td>
                      <td style={{ fontWeight:700, color:"#db2828", fontSize:13 }}>
                        Q {(s.amount_due ?? 0).toFixed(2)}
                      </td>
                      <td style={{ fontSize:12, color:"#7d8490" }}>{fmt(s.exit_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn btn-sm btn-default" onClick={onClose}>Cancelar</button>
              <button className="btn btn-sm btn-warning" style={{ fontWeight:600 }}
                disabled={sending} onClick={enviar}>
                {sending
                  ? <><i className="fa fa-spinner fa-spin" style={{ marginRight:6 }} />Enviando…</>
                  : <><i className="fa fa-bell" style={{ marginRight:6 }} />Enviar notificaciones</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const PAGE_LIMIT = 20;

export default function NotificacionesPage() {
  const [notifs,  setNotifs]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [unread,  setUnread]  = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [showDeudores, setShowDeudores] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const r = await api.get("/notifications", { params: { page: p, limit: PAGE_LIMIT } });
      const d = r.data?.data;
      setNotifs(d?.data || []);
      setTotal(d?.total || 0);
      setUnread(d?.unread || 0);
      setPage(p);
    } catch {
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const marcarLeida = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(u => Math.max(0, u - 1));
    } catch {/* silent */}
  };

  const marcarTodas = async () => {
    setMarkingAll(true);
    try {
      await api.post("/notifications/read-all");
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {/* silent */} finally {
      setMarkingAll(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <>
      <div className="row clearfix">
        <div className="col-12">
          <div className="card">
            <div className="card-header" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <i className="fa fa-bell" style={{ color:"#800020", fontSize:18 }} />
                <strong style={{ color:"#800020" }}>Centro de Notificaciones</strong>
                {unread > 0 && (
                  <span className="badge badge-danger" style={{ fontSize:11 }}>{unread} sin leer</span>
                )}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {unread > 0 && (
                  <button className="btn btn-sm btn-outline" style={{ borderColor:"#dee2e6", fontSize:12 }}
                    disabled={markingAll} onClick={marcarTodas}>
                    {markingAll
                      ? <i className="fa fa-spinner fa-spin" />
                      : <><i className="fa fa-check" style={{ marginRight:4 }} />Marcar todas</>}
                  </button>
                )}
                <button className="btn btn-sm btn-warning" style={{ fontWeight:600 }}
                  onClick={() => setShowDeudores(true)}>
                  <i className="fa fa-exclamation-triangle" style={{ marginRight:6 }} />
                  Notificar deudores
                </button>
              </div>
            </div>

            <div className="card-body" style={{ padding:0 }}>
              {loading ? (
                <div className="text-center" style={{ padding:"3rem", color:"#7d8490" }}>
                  <i className="fa fa-spinner fa-spin fa-2x" style={{ display:"block", marginBottom:12 }} />
                  Cargando notificaciones…
                </div>
              ) : notifs.length === 0 ? (
                <div className="text-center" style={{ padding:"3rem", color:"#7d8490" }}>
                  <i className="fa fa-bell-slash fa-2x" style={{ display:"block", marginBottom:10, color:"#343a40" }} />
                  <strong>Sin notificaciones</strong>
                  <div style={{ fontSize:13, marginTop:6 }}>No hay notificaciones registradas.</div>
                </div>
              ) : (
                <div>
                  {notifs.map(n => (
                    <div key={n.id} style={{
                      display:"flex", alignItems:"flex-start", gap:14, padding:"14px 20px",
                      borderBottom:"1px solid #f0f0f0",
                      background: n.is_read ? "transparent" : "rgba(128,0,32,0.03)",
                      transition:"background 0.2s",
                    }}>
                      <div style={{
                        width:38, height:38, borderRadius:"50%", flexShrink:0,
                        background: n.is_read ? "#f0f0f0" : "rgba(128,0,32,0.12)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}>
                        <i className={`fa ${TYPE_MAP[n.type]?.icon || "fa-bell"}`}
                          style={{ color: n.is_read ? "#aaa" : "#800020", fontSize:16 }} />
                      </div>

                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2, flexWrap:"wrap" }}>
                          <strong style={{ fontSize:14, color: n.is_read ? "#555" : "#222" }}>{n.title}</strong>
                          <TypeBadge type={n.type} />
                          {!n.is_read && (
                            <span style={{ width:8, height:8, borderRadius:"50%", background:"#800020", flexShrink:0 }} />
                          )}
                        </div>
                        <div style={{ fontSize:13, color:"#7d8490", marginBottom:4 }}>{n.message}</div>
                        <div style={{ fontSize:11, color:"#bbb" }}>{fmt(n.created_at)}</div>
                      </div>

                      {!n.is_read && (
                        <button className="btn btn-xs btn-outline" style={{ borderColor:"#dee2e6", flexShrink:0 }}
                          onClick={() => marcarLeida(n.id)}>
                          <i className="fa fa-check" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="card-footer" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12, color:"#7d8490" }}>
                <span>Pág. {page} de {totalPages} · {total} notificaciones</span>
                <div style={{ display:"flex", gap:6 }}>
                  <button className="btn btn-sm btn-outline" style={{ borderColor:"#dee2e6" }}
                    disabled={page <= 1} onClick={() => load(page - 1)}>
                    <i className="fa fa-chevron-left" />
                  </button>
                  <button className="btn btn-sm btn-outline" style={{ borderColor:"#dee2e6" }}
                    disabled={page >= totalPages} onClick={() => load(page + 1)}>
                    <i className="fa fa-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeudores && (
        <NotificarDeudoresModal
          onClose={() => setShowDeudores(false)}
          onDone={() => load(1)}
        />
      )}
    </>
  );
}
