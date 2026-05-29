"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";

const ROL_ES = {
  STUDENT: "Estudiante", TEACHER: "Docente", ADMIN: "Administrador",
  SECURITY: "Seguridad", VISITOR: "Visitante",
};

const REASON_ES = {
  LOST:         { label: "Pérdida",     icon: "fa-question-circle", color: "#fbbd08" },
  DAMAGED:      { label: "Daño",        icon: "fa-exclamation-triangle", color: "#f2711c" },
  STOLEN:       { label: "Robo",        icon: "fa-warning",         color: "#db2828" },
  REASSIGNMENT: { label: "Reasignación",icon: "fa-exchange",        color: "#17a2b8" },
};

// ── Buscar usuario con debounce ───────────────────────────────────────────────
function UserSearch({ onSelect, placeholder = "Buscar por nombre, carnet o correo…" }) {
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
        const r = await api.get("/users", { params: { search: q.trim(), limit: 8 } });
        setResults(r.data?.data?.data || []);
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
      <input className="form-control" placeholder={placeholder}
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
              <span className={`badge badge-${u.nfc_card_id ? "success" : "secondary"}`} style={{ marginLeft:6, fontSize:10 }}>
                {u.nfc_card_id ? "Con NFC" : "Sin NFC"}
              </span>
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

// ── Modal: Asignar NFC nueva ──────────────────────────────────────────────────
function AsignarModal({ user, onClose, onDone }) {
  const [token,   setToken]   = useState("");
  const [notes,   setNotes]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  if (!user) return null;
  const isReplace = !!user.nfc_card_id;

  const submit = async () => {
    if (!token.trim()) { setError("Ingresa el ID de la tarjeta NFC."); return; }
    setLoading(true); setError("");
    try {
      if (isReplace) {
        await api.post("/cards/replace", {
          user_id: user.id,
          reason: "REASSIGNMENT",
          old_nfc_token: user.nfc_card_id,
          new_nfc_token: token.trim(),
          notes: notes.trim() || null,
        });
      } else {
        await api.post(`/users/${user.id}/nfc`, { nfc_card_id: token.trim() });
      }
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || "Error al asignar tarjeta.");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal" style={{ display:"flex", position:"fixed", inset:0, zIndex:1060,
      background:"rgba(0,0,0,0.65)", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth:420, width:"100%", margin:0 }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" style={{ color:"#800020" }}>
              <i className="fa fa-credit-card" style={{ marginRight:8 }} />
              {isReplace ? "Reasignar tarjeta" : "Asignar tarjeta NFC"}
            </h5>
            <button style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1, padding:"0 0 0 12px", fontWeight:300 }} onClick={onClose}><span>&times;</span></button>
          </div>
          <div className="modal-body">
            <div style={{ background:"#f8f9fa", borderRadius:6, padding:"10px 14px", marginBottom:16 }}>
              <div style={{ fontWeight:700 }}>{user.first_name} {user.last_name}</div>
              <div style={{ fontSize:12, color:"#7d8490" }}>{user.carnet || user.email} · {ROL_ES[user.role] || user.role}</div>
              {isReplace && (
                <div style={{ fontSize:12, color:"#fbbd08", marginTop:4 }}>
                  <i className="fa fa-credit-card" style={{ marginRight:4 }} />
                  NFC actual: <code>{user.nfc_card_id}</code>
                </div>
              )}
            </div>
            <div className="form-group">
              <label style={{ fontSize:13, fontWeight:600 }}>ID de la nueva tarjeta NFC *</label>
              <input className="form-control" placeholder="Ej: NFC-00A1B2C3"
                value={token} onChange={e => setToken(e.target.value.toUpperCase())} />
              <small style={{ color:"#7d8490" }}>Escanea o escribe el ID impreso en la tarjeta</small>
            </div>
            <div className="form-group">
              <label style={{ fontSize:13, fontWeight:600 }}>Notas <span style={{ fontWeight:400, color:"#7d8490" }}>(opcional)</span></label>
              <textarea className="form-control form-control-sm" rows={2}
                placeholder="Ej: Tarjeta asignada en ventanilla..."
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            {error && <p style={{ color:"#db2828", fontSize:12, marginBottom:0 }}>{error}</p>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-primary btn-sm" onClick={submit} disabled={loading}>
              {loading ? <i className="fa fa-spinner fa-spin" style={{ marginRight:6 }} /> : <i className="fa fa-check" style={{ marginRight:6 }} />}
              {isReplace ? "Reasignar" : "Asignar tarjeta"}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Reportar pérdida / daño / robo ─────────────────────────────────────
function ReponerModal({ user, onClose, onDone }) {
  const [reason,    setReason]    = useState("LOST");
  const [newToken,  setNewToken]  = useState("");
  const [notes,     setNotes]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  if (!user) return null;
  const fee = reason === "REASSIGNMENT" ? 0 : 50;
  const r = REASON_ES[reason];

  const submit = async () => {
    setLoading(true); setError("");
    try {
      await api.post("/cards/replace", {
        user_id: user.id,
        reason,
        old_nfc_token: user.nfc_card_id,
        new_nfc_token: newToken.trim() || null,
        notes: notes.trim() || null,
      });
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || "Error al registrar reposición.");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal" style={{ display:"flex", position:"fixed", inset:0, zIndex:1060,
      background:"rgba(0,0,0,0.7)", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth:460, width:"100%", margin:0 }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" style={{ color:"#db2828" }}>
              <i className="fa fa-exclamation-triangle" style={{ marginRight:8 }} />
              Reportar incidencia de tarjeta
            </h5>
            <button style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1, padding:"0 0 0 12px", fontWeight:300 }} onClick={onClose}><span>&times;</span></button>
          </div>
          <div className="modal-body">
            {/* Usuario */}
            <div style={{ background:"rgba(219,40,40,0.07)", border:"1px solid rgba(219,40,40,0.2)",
              borderRadius:6, padding:"10px 14px", marginBottom:16 }}>
              <div style={{ fontWeight:700 }}>{user.first_name} {user.last_name}</div>
              <div style={{ fontSize:12, color:"#7d8490" }}>{user.carnet || user.email}</div>
              <div style={{ fontSize:12, color:"#7d8490", marginTop:4 }}>
                NFC actual: <code>{user.nfc_card_id || "Sin tarjeta"}</code>
              </div>
            </div>

            {/* Motivo */}
            <div className="form-group">
              <label style={{ fontSize:13, fontWeight:600 }}>Motivo *</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:6 }}>
                {Object.entries(REASON_ES).map(([key, val]) => (
                  <button key={key}
                    className={`btn btn-sm ${reason === key ? "btn-primary" : "btn-outline-secondary"}`}
                    style={{ fontWeight:600, padding:"8px 0",
                      background: reason===key ? "#800020" : undefined,
                      borderColor: reason===key ? "#800020" : undefined }}
                    onClick={() => setReason(key)}>
                    <i className={`fa ${val.icon}`} style={{ marginRight:6, color: reason===key ? "#fff" : val.color }} />
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nueva tarjeta (opcional) */}
            <div className="form-group">
              <label style={{ fontSize:13, fontWeight:600 }}>
                ID tarjeta nueva <span style={{ fontWeight:400, color:"#7d8490" }}>(opcional — si ya tiene reposición)</span>
              </label>
              <input className="form-control form-control-sm" placeholder="NFC-00A1B2C3 — dejar vacío si aún no se emitió"
                value={newToken} onChange={e => setNewToken(e.target.value.toUpperCase())} />
            </div>

            {/* Notas */}
            <div className="form-group">
              <label style={{ fontSize:13, fontWeight:600 }}>Notas</label>
              <textarea className="form-control form-control-sm" rows={2}
                placeholder="Circunstancias, referencia de solicitud escrita..."
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            {/* Cargo */}
            <div style={{ background: fee > 0 ? "rgba(251,189,8,0.1)" : "rgba(33,186,69,0.1)",
              border: `1px solid ${fee > 0 ? "rgba(251,189,8,0.4)" : "rgba(33,186,69,0.4)"}`,
              borderRadius:6, padding:"8px 14px", fontSize:13 }}>
              <i className={`fa ${fee > 0 ? "fa-money" : "fa-check-circle"}`}
                style={{ marginRight:6, color: fee > 0 ? "#fbbd08" : "#21ba45" }} />
              {fee > 0
                ? `Cargo por reposición: Q${fee}.00 (pendiente de cobro)`
                : "Reasignación administrativa — sin cargo"}
            </div>

            {error && <p style={{ color:"#db2828", fontSize:12, marginTop:8, marginBottom:0 }}>{error}</p>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-danger btn-sm" onClick={submit} disabled={loading}>
              {loading ? <i className="fa fa-spinner fa-spin" style={{ marginRight:6 }} /> : <i className="fa fa-exclamation-circle" style={{ marginRight:6 }} />}
              Registrar incidencia
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Dar de baja (desvincular NFC) ─────────────────────────────────────
function BajaModal({ user, onClose, onDone }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  if (!user) return null;

  const submit = async () => {
    setLoading(true); setError("");
    try {
      await api.post(`/users/${user.id}/nfc`, { nfc_card_id: null });
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || "Error al dar de baja la tarjeta.");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal" style={{ display:"flex", position:"fixed", inset:0, zIndex:1060,
      background:"rgba(0,0,0,0.65)", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth:380, width:"100%", margin:0 }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" style={{ color:"#db2828" }}>
              <i className="fa fa-times-circle" style={{ marginRight:8 }} />Dar de baja tarjeta
            </h5>
            <button style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1, padding:"0 0 0 12px", fontWeight:300 }} onClick={onClose}><span>&times;</span></button>
          </div>
          <div className="modal-body">
            <p style={{ fontSize:14 }}>
              ¿Confirmas la <strong>baja definitiva</strong> de la tarjeta NFC de{" "}
              <strong>{user.first_name} {user.last_name}</strong>?
            </p>
            <div style={{ background:"#f8f9fa", borderRadius:6, padding:"8px 12px", fontSize:12, color:"#7d8490" }}>
              NFC: <code>{user.nfc_card_id}</code>
            </div>
            <p style={{ fontSize:12, color:"#7d8490", marginTop:8, marginBottom:0 }}>
              La tarjeta quedará desvinculada y podrá ser reasignada a otro usuario. Úsalo cuando el estudiante egresa o el empleado termina su relación con la universidad.
            </p>
            {error && <p style={{ color:"#db2828", fontSize:12, marginTop:8, marginBottom:0 }}>{error}</p>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-danger btn-sm" onClick={submit} disabled={loading}>
              {loading ? <i className="fa fa-spinner fa-spin" style={{ marginRight:6 }} /> : <i className="fa fa-times" style={{ marginRight:6 }} />}
              Dar de baja
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function TarjetasNFC() {
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const limit = 20;

  const [filterRole, setFilterRole] = useState("");
  const [filterNFC,  setFilterNFC]  = useState("");
  const [search,     setSearch]     = useState("");
  const [searchInput,setSearchInput]= useState("");
  const searchTimer = useRef(null);

  // Historial
  const [history,     setHistory]     = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histTotal,   setHistTotal]   = useState(0);

  // Modales
  const [asignarTarget,  setAsignarTarget]  = useState(null);
  const [reponerTarget,  setReponerTarget]  = useState(null);
  const [bajaTarget,     setBajaTarget]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (filterRole) params.role = filterRole;
      if (search)     params.search = search;
      const r = await api.get("/users", { params });
      const data = r.data?.data?.data || [];
      setUsers(data);
      setTotal(r.data?.data?.total || 0);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [page, filterRole, search]);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const r = await api.get("/cards/replace", { params: { limit: 15 } });
      setHistory(r.data?.data?.data || []);
      setHistTotal(r.data?.data?.total || 0);
    } catch { setHistory([]); } finally { setHistLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleDone = () => {
    setAsignarTarget(null);
    setReponerTarget(null);
    setBajaTarget(null);
    load();
    loadHistory();
  };

  const handleSearch = (e) => {
    const v = e.target.value;
    setSearchInput(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 350);
  };

  // Filtro NFC client-side (field viene en la respuesta)
  const filtered = filterNFC === "WITH"
    ? users.filter(u => u.nfc_card_id)
    : filterNFC === "WITHOUT"
    ? users.filter(u => !u.nfc_card_id)
    : users;

  const withNFC    = users.filter(u => u.nfc_card_id).length;
  const withoutNFC = users.filter(u => !u.nfc_card_id).length;
  const totalPages = Math.ceil(total / limit);

  const fmt = (d) => d ? new Date(d).toLocaleDateString("es-GT", { day:"2-digit", month:"short", year:"numeric" }) : "—";

  return (
    <>
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="row clearfix" style={{ marginBottom:"0.5rem" }}>
        {[
          { label:"Usuarios mostrados", value:total,      color:"#800020", icon:"fa-users"        },
          { label:"Con tarjeta NFC",    value:withNFC,    color:"#21ba45", icon:"fa-credit-card"  },
          { label:"Sin tarjeta NFC",    value:withoutNFC, color:"#fbbd08", icon:"fa-times-circle" },
          { label:"Reposiciones totales",value:histTotal, color:"#17a2b8", icon:"fa-history"      },
        ].map(({ label, value, color, icon }) => (
          <div className="col-lg-3 col-md-6 col-sm-12" key={label}>
            <div className="card" style={{ borderLeft:`4px solid ${color}`, marginBottom:"1rem" }}>
              <div className="card-body" style={{ display:"flex", alignItems:"center", gap:"1rem", padding:"1rem 1.25rem" }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:`${color}20`,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <i className={`fa ${icon}`} style={{ color, fontSize:18 }} />
                </div>
                <div>
                  <div style={{ fontSize:22, fontWeight:700, lineHeight:1 }}>{value}</div>
                  <div style={{ fontSize:12, color:"#7d8490", marginTop:2 }}>{label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ───────────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom:"1rem" }}>
        <div className="card-body" style={{ padding:"0.85rem 1.25rem" }}>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
            <div className="input-group" style={{ maxWidth:260 }}>
              <div className="input-group-prepend">
                <span className="input-group-text"><i className="fa fa-search" /></span>
              </div>
              <input className="form-control form-control-sm"
                placeholder="Nombre, carnet o correo..."
                value={searchInput} onChange={handleSearch} />
            </div>
            <select className="form-control form-control-sm" style={{ maxWidth:150 }}
              value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}>
              <option value="">Todos los roles</option>
              {Object.entries(ROL_ES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="form-control form-control-sm" style={{ maxWidth:160 }}
              value={filterNFC} onChange={e => setFilterNFC(e.target.value)}>
              <option value="">NFC: todos</option>
              <option value="WITH">Con tarjeta</option>
              <option value="WITHOUT">Sin tarjeta</option>
            </select>
            <button className="btn btn-default btn-sm" onClick={() => { setFilterRole(""); setFilterNFC(""); setSearch(""); setSearchInput(""); setPage(1); }}>
              <i className="fa fa-times" style={{ marginRight:4 }} />Limpiar
            </button>
            <button className="btn btn-default btn-sm" style={{ marginLeft:"auto" }} onClick={load}>
              <i className="fa fa-refresh" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabla de usuarios ─────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom:"1.5rem" }}>
        <div className="card-header">
          <h3 className="card-title">
            <i className="fa fa-credit-card" style={{ marginRight:6 }} />
            Gestión de Tarjetas NFC
            <span className="badge badge-secondary" style={{ marginLeft:8, fontSize:12 }}>{filtered.length}</span>
          </h3>
        </div>
        <div className="card-body" style={{ padding:0 }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:"3rem" }}>
              <i className="fa fa-spinner fa-spin fa-2x" style={{ color:"#800020" }} />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0">
                <thead>
                  <tr style={{ background:"rgba(128,0,32,0.07)" }}>
                    <th>Usuario</th>
                    <th>Carnet / Correo</th>
                    <th>Rol</th>
                    <th>Tarjeta NFC</th>
                    <th style={{ textAlign:"center" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign:"center", padding:"2.5rem", color:"#7d8490" }}>
                        <i className="fa fa-credit-card fa-2x" style={{ display:"block", marginBottom:8, color:"#adb5bd" }} />
                        Sin usuarios que coincidan
                      </td>
                    </tr>
                  ) : filtered.map(u => (
                    <tr key={u.id}>
                      <td>
                        <strong style={{ fontSize:13 }}>{u.first_name} {u.last_name}</strong>
                      </td>
                      <td style={{ fontSize:12, color:"#7d8490" }}>{u.carnet || u.email}</td>
                      <td>
                        <span className={`badge ${
                          u.role === "ADMIN"    ? "badge-danger"  :
                          u.role === "TEACHER"  ? "badge-primary" :
                          u.role === "SECURITY" ? "badge-warning" : "badge-default"
                        }`}>{ROL_ES[u.role] || u.role}</span>
                      </td>
                      <td>
                        {u.nfc_card_id ? (
                          <span>
                            <i className="fa fa-check-circle" style={{ color:"#21ba45", marginRight:6 }} />
                            <code style={{ fontSize:12 }}>{u.nfc_card_id}</code>
                          </span>
                        ) : (
                          <span style={{ color:"#adb5bd", fontSize:12 }}>
                            <i className="fa fa-times-circle" style={{ marginRight:4 }} />Sin tarjeta
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign:"center", whiteSpace:"nowrap" }}>
                        {!u.nfc_card_id ? (
                          <button className="btn btn-success btn-sm" title="Asignar tarjeta NFC"
                            onClick={() => setAsignarTarget(u)}>
                            <i className="fa fa-plus" style={{ marginRight:4 }} />Asignar
                          </button>
                        ) : (
                          <>
                            <button className="btn btn-warning btn-sm" style={{ marginRight:4 }}
                              title="Reportar pérdida / daño / robo"
                              onClick={() => setReponerTarget(u)}>
                              <i className="fa fa-exclamation-triangle" style={{ marginRight:4 }} />Reponer
                            </button>
                            <button className="btn btn-info btn-sm" style={{ marginRight:4 }}
                              title="Reasignar tarjeta (sin cargo)"
                              onClick={() => setAsignarTarget(u)}>
                              <i className="fa fa-exchange" />
                            </button>
                            <button className="btn btn-danger btn-sm"
                              title="Dar de baja (egreso o desvinculación)"
                              onClick={() => setBajaTarget(u)}>
                              <i className="fa fa-times" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="card-footer" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8, fontSize:12, color:"#7d8490", padding:"0.65rem 1.25rem" }}>
            <span>Página {page} de {totalPages} · {total} usuarios</span>
            <div style={{ display:"flex", gap:4 }}>
              <button className="btn btn-sm btn-default" disabled={page === 1} onClick={() => setPage(1)}><i className="fa fa-angle-double-left" /></button>
              <button className="btn btn-sm btn-default" disabled={page === 1} onClick={() => setPage(p => p-1)}><i className="fa fa-angle-left" /></button>
              <button className="btn btn-sm btn-default" disabled={page === totalPages} onClick={() => setPage(p => p+1)}><i className="fa fa-angle-right" /></button>
              <button className="btn btn-sm btn-default" disabled={page === totalPages} onClick={() => setPage(totalPages)}><i className="fa fa-angle-double-right" /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Historial de reposiciones ─────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h3 className="card-title">
            <i className="fa fa-history" style={{ marginRight:6 }} />
            Historial de reposiciones
            <span className="badge badge-default" style={{ marginLeft:8, fontSize:12 }}>{histTotal}</span>
          </h3>
        </div>
        <div className="card-body" style={{ padding:0 }}>
          {histLoading ? (
            <div style={{ textAlign:"center", padding:"2rem" }}>
              <i className="fa fa-spinner fa-spin" style={{ color:"#800020" }} />
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign:"center", padding:"2.5rem", color:"#7d8490" }}>
              <i className="fa fa-history fa-2x" style={{ display:"block", marginBottom:8 }} />
              Sin reposiciones registradas
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead style={{ background:"#f8f9fa" }}>
                  <tr>
                    <th style={{ fontSize:12, color:"#7d8490" }}>Usuario</th>
                    <th style={{ fontSize:12, color:"#7d8490" }}>Motivo</th>
                    <th style={{ fontSize:12, color:"#7d8490" }}>NFC anterior</th>
                    <th style={{ fontSize:12, color:"#7d8490" }}>NFC nueva</th>
                    <th style={{ fontSize:12, color:"#7d8490" }}>Cargo</th>
                    <th style={{ fontSize:12, color:"#7d8490" }}>Fecha</th>
                    <th style={{ fontSize:12, color:"#7d8490" }}>Procesado por</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => {
                    const r = REASON_ES[h.reason] || { label: h.reason, icon:"fa-question", color:"#aaa" };
                    return (
                      <tr key={h.id}>
                        <td style={{ fontSize:13 }}>
                          <strong>{h.user?.first_name} {h.user?.last_name}</strong>
                          <div style={{ fontSize:11, color:"#7d8490" }}>{h.user?.carnet}</div>
                        </td>
                        <td>
                          <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
                            <i className={`fa ${r.icon}`} style={{ color:r.color }} />
                            {r.label}
                          </span>
                        </td>
                        <td style={{ fontSize:12 }}>
                          {h.old_nfc_token ? <code>{h.old_nfc_token}</code> : <span style={{ color:"#aaa" }}>—</span>}
                        </td>
                        <td style={{ fontSize:12 }}>
                          {h.new_nfc_token ? <code>{h.new_nfc_token}</code> : <span style={{ color:"#aaa" }}>Pendiente</span>}
                        </td>
                        <td style={{ fontSize:13 }}>
                          {parseFloat(h.replacement_fee) > 0 ? (
                            <span style={{ color: h.fee_paid ? "#21ba45" : "#fbbd08", fontWeight:600 }}>
                              Q{parseFloat(h.replacement_fee).toFixed(0)}
                              <span style={{ fontSize:10, marginLeft:4 }}>{h.fee_paid ? "Pagado" : "Pendiente"}</span>
                            </span>
                          ) : (
                            <span style={{ color:"#adb5bd", fontSize:12 }}>Sin cargo</span>
                          )}
                        </td>
                        <td style={{ fontSize:12 }}>{fmt(h.requested_at)}</td>
                        <td style={{ fontSize:12 }}>
                          {h.processed_by
                            ? `${h.processed_by.first_name} ${h.processed_by.last_name}`
                            : <span style={{ color:"#aaa" }}>—</span>}
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

      {/* ── Modales ───────────────────────────────────────────────────────────── */}
      {asignarTarget && <AsignarModal user={asignarTarget} onClose={() => setAsignarTarget(null)} onDone={handleDone} />}
      {reponerTarget && <ReponerModal user={reponerTarget} onClose={() => setReponerTarget(null)} onDone={handleDone} />}
      {bajaTarget    && <BajaModal    user={bajaTarget}    onClose={() => setBajaTarget(null)}    onDone={handleDone} />}
    </>
  );
}
