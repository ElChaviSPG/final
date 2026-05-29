"use client";
import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";

function UserSearch({ onSelect }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const timer = useRef(null);

  const search = (q) => {
    setQuery(q);
    clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.get("/users", { params: { search: q.trim(), limit: 10 } });
        const users = r.data?.data?.data || [];
        setResults(users);
        setOpen(true);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 300);
  };

  const select = (u) => {
    setQuery(`${u.first_name} ${u.last_name} (${u.carnet || u.email})`);
    setOpen(false);
    onSelect(u);
  };

  return (
    <div style={{ position: "relative" }}>
      <input className="form-control" placeholder="Buscar por carnet o correo…"
        value={query} onChange={e => search(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)} />
      {loading && <i className="fa fa-spinner fa-spin" style={{ position:"absolute", right:10, top:10, color:"#aaa" }} />}
      {open && results.length > 0 && (
        <div style={{ position:"absolute", zIndex:1080, background:"#fff", border:"1px solid #dee2e6",
          borderRadius:6, width:"100%", boxShadow:"0 4px 12px rgba(0,0,0,0.1)", maxHeight:220, overflowY:"auto" }}>
          {results.map(u => (
            <div key={u.id} onMouseDown={() => select(u)}
              style={{ padding:"8px 12px", cursor:"pointer", borderBottom:"1px solid #f0f0f0", fontSize:13 }}
              onMouseEnter={e => e.currentTarget.style.background="#f8f9fa"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <strong>{u.first_name} {u.last_name}</strong>
              <span style={{ color:"#7d8490", marginLeft:8 }}>{u.carnet || u.email}</span>
              <span className={`badge badge-${u.role==="STUDENT"?"info":u.role==="TEACHER"?"primary":"default"}`}
                style={{ marginLeft:6, fontSize:10 }}>{u.role}</span>
            </div>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && query.trim() && (
        <div style={{ position:"absolute", zIndex:1080, background:"#fff", border:"1px solid #dee2e6",
          borderRadius:6, width:"100%", padding:"10px 12px", fontSize:13, color:"#7d8490" }}>
          Sin resultados
        </div>
      )}
    </div>
  );
}

const TYPE_LABEL  = { MONTHLY: "Mensual", TRIMESTRAL: "Trimestral", SEMESTER: "Semestral" };
const STATUS_META = {
  ACTIVE:    { label: "Activa",    cls: "badge-success" },
  EXPIRED:   { label: "Vencida",   cls: "badge-danger"  },
  CANCELLED: { label: "Cancelada", cls: "badge-secondary" },
  PENDING:   { label: "Pendiente", cls: "badge-warning" },
};

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
}

function daysLeft(end) {
  const diff = Math.ceil((new Date(end) - Date.now()) / 86400000);
  if (diff < 0) return <span style={{ color: "#db2828" }}>Vencida</span>;
  if (diff === 0) return <span style={{ color: "#db2828" }}>Vence hoy</span>;
  if (diff <= 3)  return <span style={{ color: "#fbbd08" }}>{diff}d restantes</span>;
  return <span style={{ color: "#21ba45" }}>{diff}d restantes</span>;
}

export default function SuscripcionesPage() {
  const [subs,     setSubs]     = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const limit = 15;

  // Confirmación de cancelación
  const [confirmId,      setConfirmId]      = useState(null);
  const [cancelling,     setCancelling]     = useState(false);
  const [cancelError,    setCancelError]    = useState("");

  // Filtros
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType,   setFilterType]   = useState("");

  // Crear suscripción
  const [showCreate, setShowCreate] = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [createForm, setCreateForm] = useState({
    user_id: "", type: "MONTHLY", amount_paid: 0, auto_renew: false,
    start_date: new Date().toISOString().slice(0, 10), payment_reference: "",
  });
  const [createMsg, setCreateMsg]   = useState(null);

  // Job
  const [jobRunning, setJobRunning] = useState(false);
  const [jobResult,  setJobResult]  = useState(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (filterStatus) params.set("status", filterStatus);
      if (filterType)   params.set("type", filterType);
      const r = await api.get(`/subscriptions?${params}`);
      setSubs(r.data.data?.data ?? []);
      setTotal(r.data.data?.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, filterStatus, filterType]);

  async function cancelSub() {
    if (!confirmId) return;
    setCancelling(true); setCancelError("");
    try {
      await api.patch(`/subscriptions/${confirmId}`);
      setConfirmId(null);
      load();
    } catch (e) {
      setCancelError(e.response?.data?.message ?? "Error al cancelar");
      setCancelling(false);
    }
  }

  async function createSub() {
    setCreating(true); setCreateMsg(null);
    try {
      const { _userName, ...payload } = createForm;
      await api.post("/subscriptions", {
        ...payload,
        amount_paid: parseFloat(createForm.amount_paid) || 0,
      });
      setCreateMsg({ ok: true, text: "Suscripción creada correctamente" });
      setShowCreate(false);
      load();
    } catch (e) {
      setCreateMsg({ ok: false, text: e.response?.data?.message ?? "Error al crear" });
    } finally {
      setCreating(false);
    }
  }

  async function runJob() {
    setJobRunning(true); setJobResult(null);
    try {
      const r = await api.post("/subscriptions/run-job");
      setJobResult({ ok: true, ...r.data.data });
      load();
    } catch (e) {
      setJobResult({ ok: false, error: e.response?.data?.message ?? "Error" });
    } finally {
      setJobRunning(false);
    }
  }

  const totalPages = Math.ceil(total / limit);


  // ── Vista principal ───────────────────────────────────────────────────────
  return (
    <>
      {/* Encabezado */}
      <div className="row clearfix" style={{ marginBottom: "1rem" }}>
        <div className="col-12" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <h4 style={{ margin: 0 }}>
            <i className="fa fa-id-card" style={{ marginRight: 8, color: "#800020" }} />
            Suscripciones de parqueo
            <span style={{ fontSize: 13, fontWeight: 400, color: "#7d8490", marginLeft: 10 }}>
              {total} registros
            </span>
          </h4>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-success btn-sm" onClick={() => { setShowCreate(true); setCreateMsg(null); }}>
              <i className="fa fa-plus" style={{ marginRight: 4 }} />Nueva suscripción
            </button>
            <button className="btn btn-primary btn-sm" onClick={runJob} disabled={jobRunning}>
              {jobRunning
                ? <><i className="fa fa-spinner fa-spin" style={{ marginRight: 4 }} />Procesando...</>
                : <><i className="fa fa-refresh" style={{ marginRight: 4 }} />Ejecutar job</>}
            </button>
          </div>
        </div>
      </div>

      {/* Resultado del job */}
      {jobResult && (
        <div className={`alert ${jobResult.ok ? "alert-success" : "alert-danger"}`} style={{ marginBottom: "1rem" }}>
          {jobResult.ok
            ? `✓ Job completado — ${jobResult.expired} vencidas bloqueadas · ${jobResult.renewed} renovadas automáticamente · ${jobResult.alerts_sent} alertas enviadas`
            : `✗ ${jobResult.error}`}
        </div>
      )}

      {/* Mensaje de creación */}
      {createMsg && (
        <div className={`alert ${createMsg.ok ? "alert-success" : "alert-danger"}`} style={{ marginBottom: "1rem" }}>
          {createMsg.text}
        </div>
      )}

      {/* Formulario crear suscripción */}
      {showCreate && (
        <div className="card" style={{ marginBottom: "1rem", border: "2px solid #21ba45" }}>
          <div className="card-header" style={{ background: "#21ba4510" }}>
            <h3 className="card-title"><i className="fa fa-plus" style={{ marginRight: 6 }} />Nueva suscripción</h3>
            <button className="btn btn-sm btn-secondary" style={{ marginLeft: "auto" }} onClick={() => setShowCreate(false)}>
              <i className="fa fa-times" />
            </button>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4 form-group">
                <label>Carnet o correo del usuario <span style={{ color: "#db2828" }}>*</span></label>
                <UserSearch onSelect={u => setCreateForm(f => ({ ...f, user_id: u.id, _userName: `${u.first_name} ${u.last_name}` }))} />
                {createForm._userName && (
                  <small style={{ color: "#21ba45" }}><i className="fa fa-check-circle" style={{ marginRight: 4 }} />{createForm._userName}</small>
                )}
              </div>
              <div className="col-md-2 form-group">
                <label>Tipo</label>
                <select className="form-control" value={createForm.type}
                  onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="MONTHLY">Mensual (30 días)</option>
                  <option value="TRIMESTRAL">Trimestral (90 días)</option>
                  <option value="SEMESTER">Semestral (180 días)</option>
                </select>
              </div>
              <div className="col-md-2 form-group">
                <label>Inicio</label>
                <input type="date" className="form-control" value={createForm.start_date}
                  onChange={e => setCreateForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="col-md-2 form-group">
                <label>Monto pagado (Q)</label>
                <input type="number" className="form-control" value={createForm.amount_paid}
                  onChange={e => setCreateForm(f => ({ ...f, amount_paid: e.target.value }))} />
              </div>
              <div className="col-md-2 form-group">
                <label>Referencia de pago</label>
                <input className="form-control" placeholder="Opcional"
                  value={createForm.payment_reference}
                  onChange={e => setCreateForm(f => ({ ...f, payment_reference: e.target.value }))} />
              </div>
            </div>
            <div className="row">
              <div className="col-md-3 form-group" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" id="auto_renew" checked={createForm.auto_renew}
                  onChange={e => setCreateForm(f => ({ ...f, auto_renew: e.target.checked }))} />
                <label htmlFor="auto_renew" style={{ margin: 0 }}>Auto-renovar al vencer</label>
              </div>
              <div className="col-md-3">
                <button className="btn btn-success" onClick={createSub} disabled={creating || !createForm.user_id}>
                  {creating ? <><i className="fa fa-spinner fa-spin" /> Guardando...</> : "Guardar suscripción"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-body" style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: "0.75rem 1rem" }}>
          <select className="form-control" style={{ width: 160 }} value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activas</option>
            <option value="EXPIRED">Vencidas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
          <select className="form-control" style={{ width: 160 }} value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">Todos los tipos</option>
            <option value="MONTHLY">Mensual</option>
            <option value="TRIMESTRAL">Trimestral</option>
            <option value="SEMESTER">Semestral</option>
          </select>
          <button className="btn btn-default btn-sm" onClick={() => { setFilterStatus(""); setFilterType(""); setPage(1); }}>
            <i className="fa fa-times" style={{ marginRight: 4 }} />Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <i className="fa fa-spinner fa-spin fa-2x" style={{ color: "#800020" }} />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-striped" style={{ marginBottom: 0 }}>
                <thead>
                  <tr style={{ background: "#f4f6f9" }}>
                    <th>Usuario</th>
                    <th>Carnet</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Inicio</th>
                    <th>Vence</th>
                    <th>Tiempo restante</th>
                    <th>Monto</th>
                    <th>Auto-renueva</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: "center", color: "#7d8490", padding: "2rem" }}>
                      No hay suscripciones registradas
                    </td></tr>
                  ) : subs.map(s => {
                    const sm = STATUS_META[s.status] ?? { label: s.status, cls: "badge-secondary" };
                    return (
                      <tr key={s.id}>
                        <td style={{ fontSize: 13 }}>
                          <strong>{s.user?.first_name} {s.user?.last_name}</strong>
                          <div style={{ fontSize: 11, color: "#7d8490" }}>{s.user?.email}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{s.user?.carnet ?? "—"}</td>
                        <td><span className="badge badge-default">{TYPE_LABEL[s.type] ?? s.type}</span></td>
                        <td><span className={`badge ${sm.cls}`}>{sm.label}</span></td>
                        <td style={{ fontSize: 12 }}>{fmt(s.start_date)}</td>
                        <td style={{ fontSize: 12 }}>{fmt(s.end_date)}</td>
                        <td style={{ fontSize: 12 }}>{s.status === "ACTIVE" ? daysLeft(s.end_date) : "—"}</td>
                        <td style={{ fontSize: 13 }}>Q {Number(s.amount_paid).toFixed(2)}</td>
                        <td style={{ textAlign: "center" }}>
                          {s.auto_renew
                            ? <i className="fa fa-check-circle" style={{ color: "#21ba45" }} />
                            : <i className="fa fa-times-circle" style={{ color: "#aaa" }} />}
                        </td>
                        <td>
                          {s.status === "ACTIVE" && (
                            <button className="btn btn-danger btn-xs" onClick={() => { setConfirmId(s.id); setCancelError(""); }}>
                              <i className="fa fa-ban" style={{ marginRight: 3 }} />Cancelar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="card-footer" style={{ display: "flex", justifyContent: "center", gap: 4 }}>
            <button className="btn btn-sm btn-default" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <i className="fa fa-chevron-left" />
            </button>
            <span style={{ padding: "4px 12px", fontSize: 13 }}>
              Página {page} de {totalPages}
            </span>
            <button className="btn btn-sm btn-default" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <i className="fa fa-chevron-right" />
            </button>
          </div>
        )}
      </div>

      {/* ── Facturas mensuales ─────────────────────────────────────────────── */}
      <FacturasSection />

      {/* ── Modal confirmación cancelar suscripción ───────────────────────── */}
      {confirmId && (
        <div style={{
          display: "flex", position: "fixed", inset: 0, zIndex: 1060,
          background: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center",
        }} onClick={() => !cancelling && setConfirmId(null)}>
          <div style={{
            background: "#fff", borderRadius: 10, width: "100%", maxWidth: 380,
            boxShadow: "0 8px 32px rgba(0,0,0,0.22)", padding: 28,
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#db282815",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="fa fa-ban" style={{ color: "#db2828", fontSize: 20 }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#222" }}>Cancelar suscripción</div>
                <div style={{ fontSize: 13, color: "#7d8490", marginTop: 2 }}>
                  Esta acción no se puede deshacer.
                </div>
              </div>
            </div>

            {cancelError && (
              <div style={{ background: "#fdf0f0", border: "1px solid #f5c6cb",
                borderRadius: 6, padding: "8px 12px", marginBottom: 12,
                color: "#db2828", fontSize: 13 }}>
                {cancelError}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-sm btn-default"
                onClick={() => setConfirmId(null)} disabled={cancelling}>
                Cancelar
              </button>
              <button className="btn btn-sm btn-danger"
                onClick={cancelSub} disabled={cancelling}>
                {cancelling
                  ? <><i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />Cancelando…</>
                  : <><i className="fa fa-ban" style={{ marginRight: 6 }} />Confirmar cancelación</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FacturasSection() {
  const [bills,   setBills]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [paying,  setPaying]  = useState(null);
  const [filterStatus, setFilterStatus] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit: 20 };
      if (filterStatus) params.status = filterStatus;
      const r = await api.get("/billing", { params });
      setBills(r.data?.data?.data || []);
      setTotal(r.data?.data?.total || 0);
    } catch { setBills([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus]);

  const pagarFactura = async (bill) => {
    setPaying(bill.id);
    try {
      const ref = `MANUAL-${bill.id.slice(0, 8).toUpperCase()}-${Date.now()}`;
      await api.patch(`/billing/${bill.id}`, { payment_reference: ref });
      load();
    } catch { /* silent */ } finally { setPaying(null); }
  };

  const BILL_STATUS = {
    OPEN:    { label: "Abierta",  cls: "badge-warning"   },
    PAID:    { label: "Pagada",   cls: "badge-success"   },
    OVERDUE: { label: "Vencida",  cls: "badge-danger"    },
    CLOSED:  { label: "Cerrada",  cls: "badge-secondary" },
  };

  const fmtMes = (m, y) => {
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("es-GT", { month: "long", year: "numeric" });
  };

  return (
    <div className="card" style={{ marginTop: "1.5rem" }}>
      <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <i className="fa fa-file-text-o" style={{ color: "#800020", fontSize: 18 }} />
          <strong style={{ color: "#800020" }}>Facturas mensuales</strong>
          <span className="badge badge-default">{total} total</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="form-control form-control-sm" style={{ width: 150 }}
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="OPEN">Abiertas</option>
            <option value="OVERDUE">Vencidas</option>
            <option value="PAID">Pagadas</option>
            <option value="CLOSED">Cerradas</option>
          </select>
        </div>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {loading ? (
          <div className="text-center" style={{ padding: "2rem", color: "#7d8490" }}>
            <i className="fa fa-spinner fa-spin" style={{ marginRight: 8 }} />Cargando facturas…
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center" style={{ padding: "2.5rem", color: "#7d8490" }}>
            <i className="fa fa-file-o fa-2x" style={{ display: "block", marginBottom: 8 }} />
            Sin facturas registradas
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table table-hover" style={{ marginBottom: 0 }}>
              <thead style={{ background: "#f8f9fa" }}>
                <tr>
                  <th style={{ fontSize: 12, color: "#7d8490" }}>Usuario</th>
                  <th style={{ fontSize: 12, color: "#7d8490" }}>Periodo</th>
                  <th style={{ fontSize: 12, color: "#7d8490" }}>Sesiones</th>
                  <th style={{ fontSize: 12, color: "#7d8490" }}>Minutos</th>
                  <th style={{ fontSize: 12, color: "#7d8490" }}>Total</th>
                  <th style={{ fontSize: 12, color: "#7d8490" }}>Vence</th>
                  <th style={{ fontSize: 12, color: "#7d8490" }}>Estado</th>
                  <th style={{ fontSize: 12, color: "#7d8490" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(b => {
                  const s = BILL_STATUS[b.status] || { label: b.status, cls: "badge-secondary" };
                  const vencida = b.status !== "PAID" && new Date(b.due_date) < new Date();
                  return (
                    <tr key={b.id}>
                      <td>
                        <strong style={{ fontSize: 13 }}>
                          {b.user ? `${b.user.first_name} ${b.user.last_name}` : "—"}
                        </strong>
                        <div style={{ fontSize: 11, color: "#7d8490" }}>{b.user?.email}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{fmtMes(b.month, b.year)}</td>
                      <td style={{ fontSize: 13, textAlign: "center" }}>{b.total_sessions}</td>
                      <td style={{ fontSize: 13, textAlign: "center" }}>{b.total_minutes}m</td>
                      <td style={{ fontWeight: 700, color: "#800020" }}>Q {parseFloat(b.total_amount).toFixed(2)}</td>
                      <td style={{ fontSize: 12, color: vencida ? "#db2828" : "#7d8490" }}>
                        {new Date(b.due_date).toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        {vencida && <span className="badge badge-danger" style={{ marginLeft: 4, fontSize: 10 }}>VENCIDA</span>}
                      </td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td>
                        {b.status !== "PAID" && parseFloat(b.total_amount) > 0 ? (
                          <button className="btn btn-xs btn-success"
                            disabled={paying === b.id}
                            onClick={() => pagarFactura(b)}>
                            {paying === b.id
                              ? <i className="fa fa-spinner fa-spin" />
                              : <><i className="fa fa-check" style={{ marginRight: 4 }} />Pagar</>}
                          </button>
                        ) : b.status === "PAID" ? (
                          <span style={{ fontSize: 11, color: "#21ba45" }}>
                            <i className="fa fa-check-circle" style={{ marginRight: 4 }} />Pagada
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: "#7d8490" }}>Sin cargo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
