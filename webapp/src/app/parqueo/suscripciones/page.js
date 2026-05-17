"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";

const TYPE_LABEL  = { MONTHLY: "Mensual", SEMESTER: "Semestral" };
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

  async function cancelSub(id) {
    if (!confirm("¿Cancelar esta suscripción?")) return;
    try {
      await api.patch(`/subscriptions/${id}`);
      load();
    } catch (e) {
      alert(e.response?.data?.message ?? "Error");
    }
  }

  async function createSub() {
    setCreating(true); setCreateMsg(null);
    try {
      await api.post("/subscriptions", {
        ...createForm,
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
                <label>ID del usuario <span style={{ color: "#db2828" }}>*</span></label>
                <input className="form-control" placeholder="UUID del usuario"
                  value={createForm.user_id}
                  onChange={e => setCreateForm(f => ({ ...f, user_id: e.target.value }))} />
              </div>
              <div className="col-md-2 form-group">
                <label>Tipo</label>
                <select className="form-control" value={createForm.type}
                  onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="MONTHLY">Mensual (30 días)</option>
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
                            <button className="btn btn-danger btn-xs" onClick={() => cancelSub(s.id)}>
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
    </>
  );
}
