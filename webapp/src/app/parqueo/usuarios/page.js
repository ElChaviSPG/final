"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

const ROL_ES = {
  ADMIN: "Administrador", SECURITY: "Guardia", TEACHER: "Docente",
  STUDENT: "Estudiante", VISITOR: "Visitante",
};
const ROL_BADGE = {
  ADMIN: "badge-danger", SECURITY: "badge-warning", TEACHER: "badge-primary",
  STUDENT: "badge-info", VISITOR: "badge-default",
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

function RolBadge({ role }) {
  return <span className={`badge ${ROL_BADGE[role] || "badge-secondary"}`}>{ROL_ES[role] || role}</span>;
}

// ── Modal crear / editar ──────────────────────────────────────────────────────
function UsuarioModal({ user, onClose, onSaved }) {
  const esNuevo = !user?.id;
  const [form, setForm] = useState({
    first_name: user?.first_name || "",
    last_name:  user?.last_name  || "",
    email:      user?.email      || "",
    phone:      user?.phone      || "",
    role:       user?.role       || "STUDENT",
    carnet:     user?.carnet     || "",
    password:   "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [verif,   setVerif]   = useState(null); // null | "ok" | "fail"

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const verificarCarnet = async () => {
    if (!form.carnet) return;
    try {
      const r = await fetch(`/api/sistema-academico/verificar-usuario?id=${encodeURIComponent(form.carnet)}`);
      const d = await r.json();
      setVerif(d.found && d.activo ? "ok" : "fail");
    } catch {
      setVerif("fail");
    }
  };

  const guardar = async () => {
    setLoading(true); setError("");
    try {
      if (esNuevo) {
        await api.post("/users", form);
      } else {
        const { password, ...rest } = form;
        const payload = password ? { ...rest, password } : rest;
        await api.patch(`/users/${user.id}`, payload);
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || "Error al guardar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal" style={{ display:"flex", position:"fixed", inset:0, zIndex:1070,
      background:"rgba(0,0,0,0.65)", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:12, width:"100%", maxWidth:520,
        padding:28, boxShadow:"0 8px 32px rgba(0,0,0,0.18)", maxHeight:"90vh", overflowY:"auto" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
          <i className="fa fa-user" style={{ color:"#800020", fontSize:20 }} />
          <span style={{ fontWeight:700, fontSize:17, color:"#800020" }}>
            {esNuevo ? "Crear usuario" : "Editar usuario"}
          </span>
          <button style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1, padding:"0 0 0 12px", fontWeight:300 }} onClick={onClose}>&times;</button>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ padding:"8px 12px", marginBottom:16, fontSize:13 }}>
            <i className="fa fa-exclamation-circle" style={{ marginRight:6 }} />{error}
          </div>
        )}

        <div className="row">
          <div className="col-6">
            <div className="form-group">
              <label className="form-label" style={{ fontSize:12, fontWeight:600 }}>Nombre *</label>
              <input className="form-control form-control-sm" value={form.first_name} onChange={set("first_name")} />
            </div>
          </div>
          <div className="col-6">
            <div className="form-group">
              <label className="form-label" style={{ fontSize:12, fontWeight:600 }}>Apellido *</label>
              <input className="form-control form-control-sm" value={form.last_name} onChange={set("last_name")} />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontSize:12, fontWeight:600 }}>Correo electrónico *</label>
          <input className="form-control form-control-sm" type="email" value={form.email} onChange={set("email")} />
        </div>

        <div className="row">
          <div className="col-6">
            <div className="form-group">
              <label className="form-label" style={{ fontSize:12, fontWeight:600 }}>Rol *</label>
              <select className="form-control form-control-sm" value={form.role} onChange={set("role")}>
                {Object.entries(ROL_ES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="col-6">
            <div className="form-group">
              <label className="form-label" style={{ fontSize:12, fontWeight:600 }}>Teléfono</label>
              <input className="form-control form-control-sm" value={form.phone} inputMode="numeric" maxLength={8} placeholder="55551234"
                onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 8); set("phone")({ target: { value: v } }); }} />
            </div>
          </div>
        </div>

        {(form.role === "STUDENT" || form.role === "TEACHER") && (
          <div className="form-group">
            <label className="form-label" style={{ fontSize:12, fontWeight:600 }}>
              {form.role === "STUDENT" ? "Carnet" : "Código docente"}
              <span style={{ color:"#7d8490", fontWeight:400, marginLeft:6, fontSize:11 }}>
                (verificación Sistema Académico)
              </span>
            </label>
            <div style={{ display:"flex", gap:6 }}>
              <input className="form-control form-control-sm" value={form.carnet} onChange={(e) => {
                set("carnet")(e); setVerif(null);
              }} placeholder={form.role === "STUDENT" ? "2021-0001" : "D-001"} />
              <button className="btn btn-sm btn-outline" style={{ borderColor:"#dee2e6", whiteSpace:"nowrap" }}
                onClick={verificarCarnet} disabled={!form.carnet}>
                <i className="fa fa-check" style={{ marginRight:4 }} />Verificar
              </button>
            </div>
            {verif === "ok" && (
              <small style={{ color:"#21ba45" }}><i className="fa fa-check-circle" style={{ marginRight:4 }} />Activo en sistema académico</small>
            )}
            {verif === "fail" && (
              <small style={{ color:"#db2828" }}><i className="fa fa-times-circle" style={{ marginRight:4 }} />No encontrado o inactivo</small>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" style={{ fontSize:12, fontWeight:600 }}>
            {esNuevo ? "Contraseña *" : "Nueva contraseña (dejar vacío para no cambiar)"}
          </label>
          <input className="form-control form-control-sm" type="password" value={form.password} onChange={set("password")} />
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
          <button className="btn btn-sm btn-default" onClick={onClose}>Cancelar</button>
          <button className="btn btn-sm btn-danger" style={{ background:"#800020", borderColor:"#800020" }}
            disabled={loading || !form.first_name || !form.last_name || !form.email || (esNuevo && !form.password)}
            onClick={guardar}>
            {loading ? <i className="fa fa-spinner fa-spin" style={{ marginRight:6 }} /> : null}
            {esNuevo ? "Crear usuario" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal vehículos del usuario ───────────────────────────────────────────────
function VehiculosModal({ user, onClose }) {
  const [vehs, setVehs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${user.id}/vehicles`).then(r => setVehs(r.data?.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [user.id]);

  return (
    <div className="modal" style={{ display:"flex", position:"fixed", inset:0, zIndex:1070,
      background:"rgba(0,0,0,0.65)", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:12, width:"100%", maxWidth:480,
        padding:28, boxShadow:"0 8px 32px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <i className="fa fa-car" style={{ color:"#800020", fontSize:20 }} />
          <span style={{ fontWeight:700, fontSize:16, color:"#800020" }}>
            Vehículos — {user.first_name} {user.last_name}
          </span>
          <button style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1, padding:"0 0 0 12px", fontWeight:300 }} onClick={onClose}>&times;</button>
        </div>

        {loading ? (
          <div className="text-center" style={{ padding:"2rem", color:"#7d8490" }}>
            <i className="fa fa-spinner fa-spin" style={{ marginRight:8 }} />Cargando...
          </div>
        ) : vehs.length === 0 ? (
          <div className="text-center" style={{ padding:"2rem", color:"#7d8490" }}>
            <i className="fa fa-car fa-2x" style={{ display:"block", marginBottom:8 }} />
            Sin vehículos registrados
          </div>
        ) : (
          <table className="table table-sm">
            <thead><tr>
              <th>Placa</th><th>Tipo</th><th>Marca / Modelo</th><th>Estado</th>
            </tr></thead>
            <tbody>
              {vehs.map(v => (
                <tr key={v.id}>
                  <td><strong style={{ color:"#800020" }}>{v.placa}</strong></td>
                  <td style={{ fontSize:12 }}>{v.vehicle_type || "—"}</td>
                  <td style={{ fontSize:12 }}>{[v.brand, v.model].filter(Boolean).join(" ") || "—"}</td>
                  <td>
                    {v.blacklisted
                      ? <span className="badge badge-danger">Blacklist</span>
                      : v.is_authorized
                        ? <span className="badge badge-success">Autorizado</span>
                        : <span className="badge badge-warning">Pendiente</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const PAGE_LIMIT = 15;

export default function UsuariosPage() {
  const [users,   setUsers]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [modal,     setModal]     = useState(null); // null | { mode:"create"|"edit", user }
  const [vehModal,  setVehModal]  = useState(null); // user | null
  const [toggling,  setToggling]  = useState(null); // user id

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: PAGE_LIMIT };
      if (roleFilter) params.role = roleFilter;
      const r = await api.get("/users", { params });
      const d = r.data?.data;
      setUsers(d?.data || []);
      setTotal(d?.total || 0);
      setPage(p);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => { load(1); }, [load]);

  const handleToggle = async (u) => {
    setToggling(u.id);
    try {
      await api.patch(`/users/${u.id}/toggle-active`);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
    } catch {/* silent */} finally {
      setToggling(null);
    }
  };

  const filtered = search
    ? users.filter(u =>
        `${u.first_name} ${u.last_name} ${u.email} ${u.carnet || ""}`.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <>
      <div className="row clearfix">
        <div className="col-12">
          <div className="card">
            <div className="card-header" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <i className="fa fa-users" style={{ color:"#800020", fontSize:18 }} />
                <strong style={{ color:"#800020" }}>Gestión de Usuarios</strong>
                <span className="badge badge-default" style={{ marginLeft:4 }}>{total} total</span>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <input
                  className="form-control form-control-sm"
                  style={{ width:220 }}
                  placeholder="Buscar nombre, correo, carnet…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <select className="form-control form-control-sm" style={{ width:140 }}
                  value={roleFilter} onChange={e => { setRoleFilter(e.target.value); }}>
                  <option value="">Todos los roles</option>
                  {Object.entries(ROL_ES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button className="btn btn-sm btn-danger" style={{ background:"#800020", borderColor:"#800020" }}
                  onClick={() => setModal({ mode:"create", user: null })}>
                  <i className="fa fa-plus" style={{ marginRight:6 }} />Nuevo usuario
                </button>
              </div>
            </div>

            <div className="card-body" style={{ padding:0 }}>
              <div style={{ overflowX:"auto" }}>
                <table className="table table-hover" style={{ marginBottom:0 }}>
                  <thead style={{ background:"#f8f9fa" }}>
                    <tr>
                      <th style={{ fontSize:12, color:"#7d8490" }}>Nombre</th>
                      <th style={{ fontSize:12, color:"#7d8490" }}>Correo</th>
                      <th style={{ fontSize:12, color:"#7d8490" }}>Carnet / Código</th>
                      <th style={{ fontSize:12, color:"#7d8490" }}>Rol</th>
                      <th style={{ fontSize:12, color:"#7d8490" }}>Estado</th>
                      <th style={{ fontSize:12, color:"#7d8490" }}>Último acceso</th>
                      <th style={{ fontSize:12, color:"#7d8490" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="text-center" style={{ padding:"2.5rem", color:"#7d8490" }}>
                        <i className="fa fa-spinner fa-spin" style={{ marginRight:8 }} />Cargando usuarios…
                      </td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={7} className="text-center" style={{ padding:"2.5rem", color:"#7d8490" }}>
                        <i className="fa fa-users fa-2x" style={{ display:"block", marginBottom:8 }} />
                        Sin usuarios
                      </td></tr>
                    ) : filtered.map(u => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.first_name} {u.last_name}</strong>
                        </td>
                        <td style={{ fontSize:13, color:"#7d8490" }}>{u.email}</td>
                        <td style={{ fontSize:12 }}>
                          {u.carnet
                            ? <span style={{ background:"rgba(128,0,32,0.08)", color:"#800020", padding:"2px 8px", borderRadius:4, fontWeight:600, fontSize:11 }}>{u.carnet}</span>
                            : <span style={{ color:"#ccc" }}>—</span>}
                        </td>
                        <td><RolBadge role={u.role} /></td>
                        <td>
                          {u.is_active
                            ? <span className="badge badge-success">Activo</span>
                            : <span className="badge badge-danger">Inactivo</span>}
                        </td>
                        <td style={{ fontSize:12, color:"#7d8490" }}>{fmt(u.last_login_at)}</td>
                        <td>
                          <div style={{ display:"flex", gap:4 }}>
                            <button className="btn btn-xs btn-info" title="Ver vehículos"
                              onClick={() => setVehModal(u)}>
                              <i className="fa fa-car" />
                            </button>
                            <button className="btn btn-xs btn-primary" title="Editar"
                              onClick={() => setModal({ mode:"edit", user: u })}>
                              <i className="fa fa-pencil" />
                            </button>
                            <button
                              className={`btn btn-xs ${u.is_active ? "btn-warning" : "btn-success"}`}
                              title={u.is_active ? "Desactivar" : "Activar"}
                              disabled={toggling === u.id}
                              onClick={() => handleToggle(u)}>
                              {toggling === u.id
                                ? <i className="fa fa-spinner fa-spin" />
                                : <i className={`fa ${u.is_active ? "fa-ban" : "fa-check"}`} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="card-footer" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12, color:"#7d8490" }}>
                <span>Mostrando pág. {page} de {totalPages} ({total} usuarios)</span>
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

      {modal && (
        <UsuarioModal
          user={modal.user}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(page); }}
        />
      )}
      {vehModal && <VehiculosModal user={vehModal} onClose={() => setVehModal(null)} />}
    </>
  );
}
