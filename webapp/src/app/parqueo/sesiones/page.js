"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import QRCode from "qrcode";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) =>
  d ? new Date(d).toLocaleString("es-GT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "—";

const dur = (entry) => {
  const mins = Math.floor((Date.now() - new Date(entry).getTime()) / 60000);
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const dur2 = (mins) =>
  mins == null ? "—" : mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;

const monto = (entry, rate = 5) => {
  const mins = Math.floor((Date.now() - new Date(entry).getTime()) / 60000);
  return ((mins / 60) * rate).toFixed(2);
};

// ── Badge de pago ─────────────────────────────────────────────────────────────
function PagoBadge({ paid }) {
  return paid
    ? <span className="badge badge-success">Pagado</span>
    : <span className="badge badge-warning">Pendiente</span>;
}

// ── Badge de método ───────────────────────────────────────────────────────────
function MetodoBadge({ method }) {
  const map = {
    QR:     { cls: "badge-info",    label: "QR" },
    RFID:   { cls: "badge-primary", label: "RFID" },
    MANUAL: { cls: "badge-default", label: "Manual" },
    APP:    { cls: "badge-info",    label: "App" },
  };
  const m = map[method] || { cls: "badge-secondary", label: method || "—" };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

// ── Modal ticket / QR ─────────────────────────────────────────────────────────
function TicketModal({ session, rate = 5, onClose }) {
  const canvasRef = useRef(null);
  if (!session) return null;
  const minutes = Math.floor((Date.now() - new Date(session.entry_time).getTime()) / 60000);
  const total   = ((minutes / 60) * rate).toFixed(2);
  const qrData  = `USPG-PARQUEO|${session.id}|${session.vehicle?.placa}|${session.space?.code}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, qrData, { width: 160, margin: 1, color: { dark: "#1a1a2e", light: "#ffffff" } });
  }, [qrData]);

  return (
    <div className="modal" style={{
      display: "flex", position: "fixed", inset: 0, zIndex: 1050,
      background: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: 380, width: "100%", margin: 0 }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <h5 className="modal-title" style={{ color: "#800020" }}>
              <i className="fa fa-ticket" style={{ marginRight: 8 }} />
              Ticket de sesión
            </h5>
            <button style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1, padding:"0 0 0 12px", fontWeight:300 }} onClick={onClose}><span>&times;</span></button>
          </div>
          <div className="modal-body" style={{ textAlign: "center" }}>
            <div style={{
              display: "inline-block", padding: 8, background: "#fff",
              borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.2)", marginBottom: 16,
            }}>
              <canvas ref={canvasRef} />
            </div>

            <table className="table table-sm" style={{ textAlign: "left" }}>
              <tbody>
                <tr><td style={{ color: "#7d8490", width: 130 }}>Placa</td>
                  <td><strong style={{ color: "#800020" }}>{session.vehicle?.placa || "—"}</strong></td></tr>
                <tr><td style={{ color: "#7d8490" }}>Espacio</td>
                  <td>{session.space?.code || "—"} · Zona {session.space?.zone || "—"}</td></tr>
                <tr><td style={{ color: "#7d8490" }}>Entrada</td>
                  <td>{fmt(session.entry_time)}</td></tr>
                <tr><td style={{ color: "#7d8490" }}>Tiempo</td>
                  <td><strong>{minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`}</strong></td></tr>
                <tr><td style={{ color: "#7d8490" }}>Método</td>
                  <td><MetodoBadge method={session.entry_method} /></td></tr>
                <tr><td style={{ color: "#7d8490" }}>Monto</td>
                  <td><strong style={{ color: "#21ba45", fontSize: 16 }}>Q {total}</strong></td></tr>
                <tr><td style={{ color: "#7d8490" }}>Estado pago</td>
                  <td><PagoBadge paid={session.is_paid} /></td></tr>
              </tbody>
            </table>
          </div>
          <div className="modal-footer" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <button className="btn btn-default btn-sm" onClick={() => window.print()}>
              <i className="fa fa-print" style={{ marginRight: 6 }} />Imprimir
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal registrar salida ────────────────────────────────────────────────────
function SalidaModal({ session, onClose, onDone }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  if (!session) return null;
  const minutes = Math.floor((Date.now() - new Date(session.entry_time).getTime()) / 60000);

  const confirmar = async () => {
    setLoading(true);
    try {
      await api.post(`/sessions/${session.id}/exit`, {});
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || "Error al registrar salida.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal" style={{
      display: "flex", position: "fixed", inset: 0, zIndex: 1060,
      background: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: 400, width: "100%", margin: 0 }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" style={{ color: "#db2828" }}>
              <i className="fa fa-sign-out" style={{ marginRight: 8 }} />
              Confirmar salida
            </h5>
            <button style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1, padding:"0 0 0 12px", fontWeight:300 }} onClick={onClose}><span>&times;</span></button>
          </div>
          <div className="modal-body">
            <div style={{
              background: "rgba(219,40,40,0.08)", border: "1px solid rgba(219,40,40,0.3)",
              borderRadius: 6, padding: "12px 16px", marginBottom: 16,
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#800020" }}>
                {session.vehicle?.placa || "—"}
              </div>
              <div style={{ fontSize: 12, color: "#7d8490" }}>
                {session.space?.code} · Zona {session.space?.zone}
              </div>
            </div>
            <table className="table table-sm">
              <tbody>
                <tr><td style={{ color: "#7d8490", width: 130 }}>Tiempo</td>
                  <td><strong>{minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`}</strong></td></tr>
                <tr><td style={{ color: "#7d8490" }}>Monto a cobrar</td>
                  <td><strong style={{ color: "#21ba45", fontSize: 15 }}>Según tarifa de rol</strong></td></tr>
                <tr><td style={{ color: "#7d8490" }}>Estado pago</td>
                  <td><PagoBadge paid={session.is_paid} /></td></tr>
              </tbody>
            </table>
            {error && <p style={{ color: "#db2828", fontSize: 12, marginTop: 4 }}>{error}</p>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-danger btn-sm" onClick={confirmar} disabled={loading}>
              {loading
                ? <i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />
                : <i className="fa fa-sign-out" style={{ marginRight: 6 }} />}
              Registrar salida
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal de pago ─────────────────────────────────────────────────────────────
const METODOS = [
  { value: "CASH",     label: "Efectivo",     icon: "fa-money" },
  { value: "CARD",     label: "Tarjeta",      icon: "fa-credit-card" },
  { value: "TRANSFER", label: "Transferencia",icon: "fa-exchange" },
  { value: "QR_CODE",  label: "QR / Billetera",icon: "fa-qrcode" },
];

function PagoModal({ session, onClose, onPaid }) {
  const [metodo,   setMetodo]   = useState("CASH");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState("");

  if (!session) return null;
  const monto = (session.amount_due ?? 0).toFixed(2);

  const confirmar = async () => {
    setLoading(true); setError("");
    try {
      await api.post("/payments", {
        session_id:     session.id,
        payment_method: metodo,
      });
      setDone(true);
      setTimeout(() => { onPaid(session.id); onClose(); }, 1500);
    } catch (e) {
      setError(e.response?.data?.error || "Error al procesar el pago.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal" style={{ display:"flex", position:"fixed", inset:0, zIndex:1070, background:"rgba(0,0,0,0.65)", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:12, width:"100%", maxWidth:400, padding:28, boxShadow:"0 8px 32px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <i className="fa fa-check-circle" style={{ fontSize:48, color:"#21ba45" }} />
            <div style={{ marginTop:12, fontWeight:700, fontSize:18 }}>¡Pago confirmado!</div>
            <div style={{ color:"#7d8490", marginTop:4 }}>Q {monto} — {METODOS.find(m=>m.value===metodo)?.label}</div>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <i className="fa fa-money" style={{ color:"#800020", fontSize:22 }} />
              <span style={{ fontWeight:700, fontSize:17, color:"#800020" }}>Registrar pago</span>
            </div>

            <div style={{ background:"#f8f9fa", borderRadius:8, padding:"12px 16px", marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:"#7d8490", fontSize:13 }}>Vehículo</span>
                <strong>{session.vehicle?.placa || "—"}</strong>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:"#7d8490", fontSize:13 }}>Espacio</span>
                <strong>{session.space?.code || "—"}</strong>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#7d8490", fontSize:13 }}>Duración</span>
                <strong>{dur2(session.duration_minutes)}</strong>
              </div>
            </div>

            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ color:"#7d8490", fontSize:13, marginBottom:4 }}>Total a cobrar</div>
              <div style={{ fontSize:36, fontWeight:800, color:"#800020" }}>Q {monto}</div>
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:10, color:"#555" }}>Método de pago</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {METODOS.map(m => (
                  <button key={m.value} onClick={() => setMetodo(m.value)}
                    style={{ border:`2px solid ${metodo===m.value?"#800020":"#dee2e6"}`, background:metodo===m.value?"rgba(128,0,32,0.07)":"#fff", borderRadius:8, padding:"10px 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, transition:"all 0.15s" }}>
                    <i className={`fa ${m.icon}`} style={{ fontSize:18, color:metodo===m.value?"#800020":"#7d8490" }} />
                    <span style={{ fontSize:12, fontWeight:600, color:metodo===m.value?"#800020":"#555" }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="alert alert-danger" style={{ padding:"8px 12px", marginBottom:12, fontSize:13 }}>{error}</div>}

            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-outline" style={{ flex:1 }} onClick={onClose} disabled={loading}>Cancelar</button>
              <button className="btn btn-success" style={{ flex:2, fontWeight:700 }} onClick={confirmar} disabled={loading}>
                {loading ? <i className="fa fa-spinner fa-spin" /> : <><i className="fa fa-check" style={{ marginRight:6 }} />Confirmar pago</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function SesionesActivas() {
  const [sessions, setSessions]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tariffs, setTariffs]     = useState({});
  const [ticket, setTicket]       = useState(null);
  const [salida, setSalida]       = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const [history,      setHistory]      = useState([]);
  const [historyLoad,  setHistoryLoad]  = useState(false);
  const [historyPage,  setHistoryPage]  = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [pagoTarget,   setPagoTarget]   = useState(null);
  const HIST_LIMIT = 10;

  // Filtros
  const [filterZone,   setFilterZone]   = useState("ALL");
  const [filterMethod, setFilterMethod] = useState("ALL");
  const [filterPaid,   setFilterPaid]   = useState("ALL");
  const [search,       setSearch]       = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/sessions/active");
      setSessions(res.data.data?.sessions || []);
      setLastUpdate(new Date());
    } catch (e) {
      console.error("Error cargando sesiones:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    api.get("/tariffs").then(r => {
      const map = {};
      (r.data.data || []).forEach(t => { map[t.role] = t; });
      setTariffs(map);
    }).catch(() => {});
  }, []);

  const loadHistory = useCallback(async (page = 1) => {
    setHistoryLoad(true);
    try {
      const res = await api.get(`/sessions/history?page=${page}&limit=${HIST_LIMIT}`);
      setHistory(res.data.data?.sessions || []);
      setHistoryTotal(res.data.data?.total || 0);
      setHistoryPage(page);
    } catch (e) {
      console.error("Error cargando historial:", e);
    } finally {
      setHistoryLoad(false);
    }
  }, []);

  useEffect(() => { loadHistory(1); }, [loadHistory]);

  const handleSalidaDone = () => { setSalida(null); load(); loadHistory(1); };

  // Filtrado
  const filtered = sessions.filter(s => {
    if (filterZone   !== "ALL" && s.space?.zone     !== filterZone)   return false;
    if (filterMethod !== "ALL" && s.entry_method    !== filterMethod) return false;
    if (filterPaid   === "PAID"    && !s.is_paid)  return false;
    if (filterPaid   === "PENDING" &&  s.is_paid)  return false;
    if (search) {
      const q = search.toUpperCase();
      const plate = (s.vehicle?.placa || "").toUpperCase();
      const name  = s.notes?.startsWith("Visitante:")
        ? s.notes.replace("Visitante:", "").trim().toUpperCase()
        : `${s.user?.first_name || ""} ${s.user?.last_name || ""}`.toUpperCase();
      if (!plate.includes(q) && !name.includes(q)) return false;
    }
    return true;
  });

  // Totales para el resumen
  const sessionRate = (s) => {
    const t = tariffs[s.user?.role];
    if (!t) return 5;
    if (t.is_free) {
      if (!t.max_free_hours) return 0;
      const hrs = (Date.now() - new Date(s.entry_time).getTime()) / 3600000;
      return hrs <= t.max_free_hours ? 0 : t.hourly_rate;
    }
    return t.hourly_rate;
  };

  const totalMonto = filtered.reduce((acc, s) => acc + parseFloat(monto(s.entry_time, sessionRate(s))), 0);

  if (loading) return (
    <div className="text-center" style={{ padding: "3rem" }}>
      <i className="fa fa-spinner fa-spin fa-2x" style={{ color: "#800020" }} />
      <p style={{ color: "#7d8490", marginTop: "1rem" }}>Cargando sesiones...</p>
    </div>
  );

  return (
    <>
      {/* ── Stat strip ───────────────────────────────────────────────────────── */}
      <div className="row clearfix" style={{ marginBottom: "0.5rem" }}>
        {[
          { label: "Sesiones activas", value: sessions.length, color: "#800020", icon: "fa-clock-o" },
          { label: "Mostrando",        value: filtered.length,  color: "#17a2b8", icon: "fa-filter" },
          { label: "Sin pagar",        value: sessions.filter(s => !s.is_paid).length, color: "#fbbd08", icon: "fa-money" },
          { label: "Monto acumulado",  value: `Q ${totalMonto.toFixed(2)}`, color: "#21ba45", icon: "fa-usd" },
        ].map(({ label, value, color, icon }) => (
          <div className="col-lg-3 col-md-6 col-sm-12" key={label}>
            <div className="card" style={{ borderLeft: `4px solid ${color}`, marginBottom: "1rem" }}>
              <div className="card-body" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className={`fa ${icon}`} style={{ color, fontSize: 18 }} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 12, color: "#7d8490", marginTop: 2 }}>{label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ───────────────────────────────────────────────────────────── */}
      <div className="row clearfix">
        <div className="col-12">
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div className="card-body" style={{ padding: "0.85rem 1.25rem" }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                {/* Búsqueda */}
                <div className="input-group" style={{ maxWidth: 220 }}>
                  <div className="input-group-prepend">
                    <span className="input-group-text"><i className="fa fa-search" /></span>
                  </div>
                  <input className="form-control form-control-sm"
                    placeholder="Placa o nombre..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                {/* Zona */}
                <select className="form-control form-control-sm" style={{ maxWidth: 130 }}
                  value={filterZone} onChange={e => setFilterZone(e.target.value)}>
                  <option value="ALL">Todas las zonas</option>
                  {["A", "B", "C", "D"].map(z => <option key={z} value={z}>Zona {z}</option>)}
                </select>

                {/* Método */}
                <select className="form-control form-control-sm" style={{ maxWidth: 140 }}
                  value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
                  <option value="ALL">Todos los métodos</option>
                  <option value="QR">QR</option>
                  <option value="RFID">RFID</option>
                  <option value="MANUAL">Manual</option>
                  <option value="APP">App</option>
                </select>

                {/* Pago */}
                <select className="form-control form-control-sm" style={{ maxWidth: 130 }}
                  value={filterPaid} onChange={e => setFilterPaid(e.target.value)}>
                  <option value="ALL">Todos</option>
                  <option value="PAID">Pagados</option>
                  <option value="PENDING">Pendientes</option>
                </select>

                <button className="btn btn-default btn-sm" onClick={load} style={{ marginLeft: "auto" }}>
                  <i className="fa fa-refresh" style={{ marginRight: 6 }} />
                  Actualizar
                </button>

                {lastUpdate && (
                  <span style={{ fontSize: 11, color: "#7d8490" }}>
                    {lastUpdate.toLocaleTimeString("es-GT")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabla ─────────────────────────────────────────────────────────────── */}
      <div className="row clearfix">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fa fa-clock-o" style={{ marginRight: 6 }} />
                Sesiones activas
                <span className="badge badge-danger" style={{ marginLeft: 8, fontSize: 12 }}>
                  {filtered.length}
                </span>
              </h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-responsive">
                <table className="table table-hover table-striped mb-0">
                  <thead>
                    <tr style={{ background: "rgba(128,0,32,0.08)" }}>
                      <th>Placa</th>
                      <th>Propietario</th>
                      <th>Zona</th>
                      <th>Espacio</th>
                      <th>Entrada</th>
                      <th>Tiempo</th>
                      <th>Monto</th>
                      <th>Método</th>
                      <th>Pago</th>
                      <th style={{ textAlign: "center" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center" style={{ padding: "2.5rem", color: "#7d8490" }}>
                          <i className="fa fa-car fa-2x" style={{ display: "block", marginBottom: 8, color: "#343a40" }} />
                          Sin sesiones activas
                        </td>
                      </tr>
                    ) : (
                      filtered.map(s => (
                        <tr key={s.id}>
                          <td>
                            <strong style={{ color: "#800020" }}>{s.vehicle?.placa || "—"}</strong>
                            {s.vehicle?.blacklisted && (
                              <span className="badge badge-danger" style={{ marginLeft: 6, fontSize: 10 }}>
                                <i className="fa fa-ban" /> BL
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 13 }}>
                            {s.notes?.startsWith("Visitante:")
                              ? s.notes.replace("Visitante:", "").trim()
                              : s.user
                                ? `${s.user.first_name} ${s.user.last_name}`
                                : "—"}
                          </td>
                          <td>
                            <span className="badge badge-default">Zona {s.space?.zone || "—"}</span>
                          </td>
                          <td>
                            <span className="badge" style={{ background: "rgba(128,0,32,0.15)", color: "#800020" }}>
                              {s.space?.code || "—"}
                            </span>
                          </td>
                          <td style={{ fontSize: 12 }}>{fmt(s.entry_time)}</td>
                          <td>
                            <strong style={{ color: "#17a2b8" }}>{dur(s.entry_time)}</strong>
                          </td>
                          <td style={{ fontWeight: 700, color: "#21ba45" }}>
                            Q {monto(s.entry_time, sessionRate(s))}
                          </td>
                          <td><MetodoBadge method={s.entry_method} /></td>
                          <td><PagoBadge paid={s.is_paid} /></td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ marginRight: 4 }}
                              onClick={() => setSalida(s)}
                              title="Registrar salida"
                            >
                              <i className="fa fa-sign-out" />
                            </button>
                            <button
                              className="btn btn-info btn-sm"
                              onClick={() => setTicket(s)}
                              title="Ver ticket"
                            >
                              <i className="fa fa-ticket" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {filtered.length > 0 && (
              <div className="card-footer" style={{ fontSize: 12, color: "#7d8490", padding: "0.65rem 1.25rem" }}>
                Mostrando {filtered.length} de {sessions.length} sesiones ·
                Monto total estimado: <strong style={{ color: "#21ba45" }}>Q {totalMonto.toFixed(2)}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Historial de sesiones completadas ─────────────────────────────── */}
      <div className="row clearfix" style={{ marginTop: 8 }}>
        <div className="col-12">
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="card-title">
                <i className="fa fa-history" style={{ marginRight: 8, color: "#800020" }} />
                Historial de sesiones
              </h3>
              <button className="btn btn-outline btn-sm"
                style={{ borderColor: "#800020", color: "#800020" }}
                onClick={() => loadHistory(historyPage)}>
                <i className="fa fa-refresh" style={{ marginRight: 4 }} />Actualizar
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover table-striped mb-0">
                  <thead>
                    <tr style={{ background: "rgba(128,0,32,0.08)" }}>
                      <th>Placa</th>
                      <th>Propietario</th>
                      <th>Zona</th>
                      <th>Espacio</th>
                      <th>Entrada</th>
                      <th>Salida</th>
                      <th>Duración</th>
                      <th>Monto</th>
                      <th>Método</th>
                      <th>Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoad ? (
                      <tr>
                        <td colSpan={10} className="text-center" style={{ padding: "2rem", color: "#7d8490" }}>
                          <i className="fa fa-spinner fa-spin" style={{ marginRight: 8 }} />Cargando historial...
                        </td>
                      </tr>
                    ) : history.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center" style={{ padding: "2.5rem", color: "#7d8490" }}>
                          <i className="fa fa-history fa-2x" style={{ display: "block", marginBottom: 8, color: "#343a40" }} />
                          Sin sesiones completadas
                        </td>
                      </tr>
                    ) : history.map(s => (
                      <tr key={s.id}>
                        <td><strong style={{ color: "#800020" }}>{s.vehicle?.placa || "—"}</strong></td>
                        <td style={{ fontSize: 13 }}>
                          {s.notes?.startsWith("Visitante:")
                            ? s.notes.replace("Visitante:", "").trim()
                            : s.user
                              ? `${s.user.first_name} ${s.user.last_name}`
                              : "—"}
                        </td>
                        <td><span className="badge badge-default">Zona {s.space?.zone || "—"}</span></td>
                        <td>
                          <span className="badge" style={{ background: "rgba(128,0,32,0.15)", color: "#800020" }}>
                            {s.space?.code || "—"}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>{fmt(s.entry_time)}</td>
                        <td style={{ fontSize: 12 }}>
                          {s.exit_time
                            ? <span style={{ color: "#21ba45" }}>{fmt(s.exit_time)}</span>
                            : <span style={{ color: "#7d8490" }}>—</span>}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {s.duration_minutes != null
                            ? <strong style={{ color: "#17a2b8" }}>{dur2(s.duration_minutes)}</strong>
                            : "—"}
                        </td>
                        <td style={{ fontWeight: 700, color: s.amount_due === 0 ? "#21ba45" : "#fbbd08" }}>
                          Q {(s.amount_due ?? 0).toFixed(2)}
                        </td>
                        <td><MetodoBadge method={s.entry_method} /></td>
                        <td>
                          {s.is_paid ? (
                            <PagoBadge paid={true} />
                          ) : (
                            <button className="btn btn-warning btn-sm" style={{ fontWeight:600, fontSize:11, padding:"2px 10px" }}
                              onClick={() => setPagoTarget(s)}>
                              <i className="fa fa-money" style={{ marginRight:4 }} />Pagar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {historyTotal > HIST_LIMIT && (
              <div className="card-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#7d8490" }}>
                <span>Mostrando {history.length} de {historyTotal} sesiones</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-sm btn-outline"
                    style={{ borderColor: "#dee2e6" }}
                    disabled={historyPage <= 1}
                    onClick={() => loadHistory(historyPage - 1)}>
                    <i className="fa fa-chevron-left" />
                  </button>
                  <span style={{ padding: "4px 8px" }}>Pág. {historyPage}</span>
                  <button className="btn btn-sm btn-outline"
                    style={{ borderColor: "#dee2e6" }}
                    disabled={historyPage * HIST_LIMIT >= historyTotal}
                    onClick={() => loadHistory(historyPage + 1)}>
                    <i className="fa fa-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {ticket && <TicketModal session={ticket} rate={sessionRate(ticket)} onClose={() => setTicket(null)} />}
      {salida && <SalidaModal session={salida} onClose={() => setSalida(null)} onDone={handleSalidaDone} />}
      {pagoTarget && (
        <PagoModal
          session={pagoTarget}
          onClose={() => setPagoTarget(null)}
          onPaid={(id) => {
            setHistory(prev => prev.map(s => s.id === id ? { ...s, is_paid: true } : s));
            setPagoTarget(null);
          }}
        />
      )}
    </>
  );
}
