"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

// ── Colores por estado ────────────────────────────────────────────────────────
const STATUS_COLOR = {
  AVAILABLE:   { fill: "#21ba45", stroke: "#1a9438", label: "Disponible" },
  OCCUPIED:    { fill: "#db2828", stroke: "#b52020", label: "Ocupado"    },
  RESERVED:    { fill: "#fbbd08", stroke: "#d4a007", label: "Reservado"  },
  MAINTENANCE: { fill: "#7d8490", stroke: "#5a5f66", label: "Mantenim."  },
};

const TYPE_OVERRIDE = {
  HANDICAPPED: { fill: "#17a2b8", stroke: "#138496", label: "Discapacidad" },
  ELECTRIC:    { fill: "#6435c9", stroke: "#4d28a0", label: "Eléctrico"   },
  VIP:         { fill: "#800020", stroke: "#5a0016", label: "VIP"         },
  TEACHER:     { fill: "#800020", stroke: "#5a0016", label: "Docente"     },
};

// ── Modal de detalle de espacio ───────────────────────────────────────────────
function SpaceModal({ space, onClose, onAssign, onStatusChange }) {
  const [toggling, setToggling] = useState(false);
  const [toggleMsg, setToggleMsg] = useState("");

  if (!space) return null;
  const session    = space._session;
  const isOccupied = space.status === "OCCUPIED";
  const isMaint    = space.status === "MAINTENANCE";
  const dur = session
    ? Math.floor((Date.now() - new Date(session.entry_time).getTime()) / 60000)
    : 0;
  const monto = session ? ((dur / 60) * 5).toFixed(2) : "0.00";

  const toggleMaintenance = async () => {
    setToggling(true); setToggleMsg("");
    const newStatus = isMaint ? "AVAILABLE" : "MAINTENANCE";
    try {
      await api.patch(`/spaces/${space.id}`, { status: newStatus });
      onStatusChange?.();
      onClose();
    } catch (e) {
      setToggleMsg(e.response?.data?.message || "Error al cambiar estado.");
      setToggling(false);
    }
  };

  return (
    <div className="modal" style={{
      display: "flex", position: "fixed", inset: 0, zIndex: 1050,
      background: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: 440, width: "100%", margin: 0 }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <h5 className="modal-title" style={{ color: "#800020" }}>
              <i className="fa fa-map-marker" style={{ marginRight: 8 }} />
              Espacio {space.code} — Zona {space.zone}
            </h5>
            <button type="button" className="close" onClick={onClose}><span>&times;</span></button>
          </div>
          <div className="modal-body">
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <span className={`badge ${
                space.status === "AVAILABLE"   ? "badge-success"   :
                space.status === "OCCUPIED"    ? "badge-danger"    :
                space.status === "RESERVED"    ? "badge-warning"   : "badge-secondary"
              }`}>{STATUS_COLOR[space.status]?.label || space.status}</span>
              <span className="badge badge-default">{space.type}</span>
            </div>

            {isOccupied && session ? (
              <table className="table table-sm">
                <tbody>
                  <tr><td style={{ color: "#7d8490", width: 140 }}>Placa</td>
                    <td><strong style={{ color: "#800020" }}>{session.vehicle?.placa || "—"}</strong></td></tr>
                  <tr><td style={{ color: "#7d8490" }}>Propietario</td>
                    <td>{session.user ? `${session.user.first_name} ${session.user.last_name}` : "—"}</td></tr>
                  <tr><td style={{ color: "#7d8490" }}>Hora entrada</td>
                    <td>{session.entry_time ? new Date(session.entry_time).toLocaleTimeString("es-GT") : "—"}</td></tr>
                  <tr><td style={{ color: "#7d8490" }}>Tiempo</td>
                    <td><strong>{dur < 60 ? `${dur}m` : `${Math.floor(dur / 60)}h ${dur % 60}m`}</strong></td></tr>
                  <tr><td style={{ color: "#7d8490" }}>Monto</td>
                    <td><strong style={{ color: "#21ba45" }}>Q {monto}</strong></td></tr>
                </tbody>
              </table>
            ) : isMaint ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <i className="fa fa-wrench fa-3x" style={{ color: "#7d8490", display: "block", marginBottom: 12 }} />
                <p style={{ color: "#7d8490", marginBottom: 0 }}>Espacio en mantenimiento</p>
              </div>
            ) : !isOccupied ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <i className="fa fa-check-circle fa-3x" style={{ color: "#21ba45", display: "block", marginBottom: 12 }} />
                <p style={{ color: "#7d8490", marginBottom: 0 }}>Espacio disponible</p>
              </div>
            ) : (
              <p style={{ color: "#7d8490" }}>Sin datos de sesión activa.</p>
            )}

            {toggleMsg && <p style={{ color: "#db2828", fontSize: 12, marginTop: 8 }}>{toggleMsg}</p>}
          </div>

          <div className="modal-footer" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", flexWrap: "wrap", gap: 6 }}>
            {!isOccupied && !isMaint && (
              <button className="btn btn-success btn-sm" onClick={() => onAssign(space)}>
                <i className="fa fa-plus" style={{ marginRight: 6 }} />Asignar manualmente
              </button>
            )}
            {!isOccupied && (
              <button className="btn btn-warning btn-sm" onClick={toggleMaintenance} disabled={toggling}
                style={{ background: isMaint ? "#21ba45" : "#fbbd08", borderColor: isMaint ? "#1a9438" : "#d4a007", color: "#fff" }}>
                {toggling
                  ? <i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />
                  : <i className={`fa ${isMaint ? "fa-check" : "fa-wrench"}`} style={{ marginRight: 6 }} />}
                {isMaint ? "Marcar disponible" : "Poner en mantenimiento"}
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal asignación manual ────────────────────────────────────────────────────
function AssignModal({ space, onClose, onSubmit }) {
  const [plate,     setPlate]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [found,     setFound]     = useState(null);
  // registro rápido de visitante
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ first_name: "", last_name: "", phone: "", brand: "", model: "", color: "" });
  const [registering, setRegistering] = useState(false);

  const searchVehicle = async () => {
    if (!plate.trim()) return;
    setMsg(""); setFound(null); setVehicleId(""); setShowRegister(false);
    try {
      const res = await api.get(`/vehicles/search?plate=${plate.toUpperCase()}`);
      const v = res.data.data;
      setFound(v); setVehicleId(v.id);
    } catch {
      setMsg("Vehículo no encontrado.");
      setShowRegister(true);
    }
  };

  const registerVisitor = async () => {
    if (!plate.trim() || !regForm.first_name.trim()) {
      setMsg("Placa y nombre son requeridos."); return;
    }
    setRegistering(true); setMsg("");
    try {
      // 1. Crear usuario visitante
      const placaClean = plate.toUpperCase().replace(/\s/g, "");
      const userRes = await api.post("/users", {
        first_name:    regForm.first_name.trim(),
        last_name:     regForm.last_name.trim() || "Visitante",
        email:         `visitante-${placaClean.toLowerCase()}@uspg.local`,
        password:      crypto.randomUUID(),
        role:          "VISITOR",
        phone:         regForm.phone?.trim() || null,
        is_active:     true,
      });
      const userId = userRes.data.data?.id;
      if (!userId) throw new Error("No se pudo crear el usuario visitante.");

      // 2. Registrar vehículo ligado al nuevo usuario visitante
      const vRes = await api.post("/vehicles", {
        placa:   placaClean,
        brand:   regForm.brand  || "No especificado",
        model:   regForm.model  || "No especificado",
        color:   regForm.color  || "No especificado",
        user_id: userId,
      });
      const v = vRes.data.data;
      setFound({ ...v, user: userRes.data.data });
      setVehicleId(v.id);
      setShowRegister(false);
      setMsg("");
    } catch (e) {
      setMsg(e.response?.data?.message || "Error al registrar visitante.");
    } finally { setRegistering(false); }
  };

  const submit = async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      await api.post("/sessions", { vehicle_id: vehicleId, space_id: space.id, entry_method: "MANUAL" });
      onSubmit();
    } catch (e) {
      setMsg(e.response?.data?.message || "Error al registrar entrada.");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal" style={{
      display: "flex", position: "fixed", inset: 0, zIndex: 1060,
      background: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: 420, width: "100%", margin: 0 }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" style={{ color: "#800020" }}>Asignar espacio {space.code}</h5>
            <button className="close" onClick={onClose}><span>&times;</span></button>
          </div>
          <div className="modal-body">

            {/* Búsqueda por placa */}
            <div className="form-group">
              <label style={{ fontSize: 13, fontWeight: 600 }}>Buscar por placa</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="form-control" value={plate}
                  onChange={e => { setPlate(e.target.value.toUpperCase()); setMsg(""); setFound(null); setVehicleId(""); setShowRegister(false); }}
                  onKeyDown={e => e.key === "Enter" && searchVehicle()}
                  placeholder="ABC-123" />
                <button className="btn btn-primary" onClick={searchVehicle}
                  style={{ whiteSpace: "nowrap", fontWeight: 600, minWidth: 80 }}>
                  <i className="fa fa-search" style={{ marginRight: 4 }} />Buscar
                </button>
              </div>
            </div>

            {/* Vehículo encontrado */}
            {found && (
              <div style={{ background: "rgba(33,186,69,0.08)", border: "1px solid rgba(33,186,69,0.3)", borderRadius: 6, padding: "10px 14px", marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <i className="fa fa-check-circle" style={{ color: "#21ba45" }} />
                  <strong style={{ color: "#800020" }}>{found.placa}</strong>
                  {found.user?.role === "VISITOR" && (
                    <span className="badge badge-warning" style={{ fontSize: 10 }}>Visitante</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#7d8490" }}>
                  {[found.brand, found.model, found.color, found.year].filter(Boolean).join(" · ")}
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Propietario: <strong>{found.user ? `${found.user.first_name} ${found.user.last_name}` : "—"}</strong>
                  {found.user?.role === "VISITOR" && (
                    <span style={{ color: "#7d8490", marginLeft: 6 }}>(Visitante registrado)</span>
                  )}
                </div>
                {found.blacklisted && (
                  <div style={{ color: "#db2828", fontWeight: 700, marginTop: 4, fontSize: 12 }}>
                    <i className="fa fa-ban" style={{ marginRight: 4 }} /> EN LISTA NEGRA
                  </div>
                )}
              </div>
            )}

            {/* Registro rápido de visitante */}
            {showRegister && (
              <div style={{ background: "rgba(251,189,8,0.08)", border: "1px solid rgba(251,189,8,0.35)", borderRadius: 6, padding: "14px", marginTop: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "#fbbd08", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="fa fa-id-card-o" />
                  Registrar visitante nuevo
                </div>
                <div className="row">
                  <div className="col-6 form-group" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12 }}>Nombre *</label>
                    <input className="form-control form-control-sm" placeholder="Juan"
                      value={regForm.first_name}
                      onChange={e => setRegForm(f => ({ ...f, first_name: e.target.value }))} />
                  </div>
                  <div className="col-6 form-group" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12 }}>Apellido</label>
                    <input className="form-control form-control-sm" placeholder="Pérez"
                      value={regForm.last_name}
                      onChange={e => setRegForm(f => ({ ...f, last_name: e.target.value }))} />
                  </div>
                  <div className="col-12 form-group" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12 }}>Teléfono <span style={{ color: "#aaa" }}>(opcional)</span></label>
                    <input className="form-control form-control-sm" placeholder="5555-0000"
                      value={regForm.phone}
                      onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="col-4 form-group" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12 }}>Marca</label>
                    <input className="form-control form-control-sm" placeholder="Toyota"
                      value={regForm.brand}
                      onChange={e => setRegForm(f => ({ ...f, brand: e.target.value }))} />
                  </div>
                  <div className="col-4 form-group" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12 }}>Modelo</label>
                    <input className="form-control form-control-sm" placeholder="Corolla"
                      value={regForm.model}
                      onChange={e => setRegForm(f => ({ ...f, model: e.target.value }))} />
                  </div>
                  <div className="col-4 form-group" style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12 }}>Color</label>
                    <input className="form-control form-control-sm" placeholder="Blanco"
                      value={regForm.color}
                      onChange={e => setRegForm(f => ({ ...f, color: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-warning btn-sm" onClick={registerVisitor} disabled={registering}
                  style={{ width: "100%", marginTop: 4 }}>
                  {registering
                    ? <><i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />Registrando...</>
                    : <><i className="fa fa-user-plus" style={{ marginRight: 6 }} />Registrar y continuar</>}
                </button>
              </div>
            )}

            {msg && !showRegister && <p style={{ color: "#db2828", fontSize: 12, marginTop: 8, marginBottom: 0 }}>{msg}</p>}
            {msg &&  showRegister && <p style={{ color: "#db2828", fontSize: 12, marginTop: 6, marginBottom: 0 }}>{msg}</p>}
          </div>

          <div className="modal-footer">
            <button className="btn btn-success btn-sm" disabled={!vehicleId || loading || found?.blacklisted} onClick={submit}>
              {loading ? <i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} /> : <i className="fa fa-sign-in" style={{ marginRight: 6 }} />}
              Registrar entrada
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mapa con imagen satelital real + polígonos SVG ───────────────────────────
// Imagen: mapa-campus-real.png — 1536×1024 px
// viewBox: 0 0 1536 1024
// Coordenadas estimadas sobre los 6 parqueos visibles en la imagen real.

// Coordenadas trazadas sobre mapa-campus-real.png (1536×1024)
// P5 = rectángulo arriba centro
// P1 = rectángulo izquierda (grande, 3 filas de espacios)
// P2 = rectángulo centro-inferior
// P6 = polígono irregular grande centro-derecha
// P3 = dos tiras paralelas lado derecho
// P4 = rectángulo derecha-inferior
const PARQUEOS = [
  {
    id: "P5", zone: "A", label: "Parqueo 5",
    pts: "631.613,17.504 714.758,62.724 612.65,195.464 526.587,134.199",
    lx: 621, ly: 102,
  },
  {
    id: "P1", zone: "A", label: "Parqueo 1",
    pts: "224.638,627.236 423.02,285.903 504.707,339.875 309.242,681.208",
    lx: 365, ly: 483,
  },
  {
    id: "P2", zone: "B", label: "Parqueo 2",
    pts: "468.239,590.769 666.621,694.336 625.778,761.436 433.231,643.282",
    lx: 548, ly: 672,
  },
  {
    id: "P6", zone: "B", label: "Parqueo 6",
    pts: "781.858,633.071 986.074,590.769 1059.01,809.573 951.066,951.066 853.333,933.561 748.308,816.866 723.51,697.254",
    lx: 871, ly: 790,
  },
  {
    id: "P3", zone: "C", label: "Parqueo 3",
    pts: "1117.36,463.863 1184.46,516.376 1080.89,637.447 1018.17,577.641",
    lx: 1100, ly: 548,
  },
  {
    id: "P4", zone: "D", label: "Parqueo 4",
    pts: "1204.88,554.302 1277.81,602.439 1153.82,774.564 1075.05,710.382",
    lx: 1178, ly: 660,
  },
];

function zoneColor(pct) {
  if (pct > 85) return "#db2828";
  if (pct > 60) return "#fbbd08";
  return "#21ba45";
}

// Panel lateral: grid de espacios del parqueo seleccionado
function SpacePanel({ parqueo, zoneSpaces, onClose, onSpaceClick }) {
  const [selectedSpace, setSelectedSpace] = useState(null);

  const spaceColor = (sp) => {
    if (selectedSpace?.id === sp.id) return "#1678c2";
    if (sp.status === "OCCUPIED")    return "#db2828";
    if (sp.status === "RESERVED")    return "#fbbd08";
    if (sp.status === "MAINTENANCE") return "#7d8490";
    return "#21ba45";
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: "16px",
      width: 290, boxShadow: "0 4px 24px rgba(0,0,0,0.22)",
      color: "#222", flexShrink: 0, alignSelf: "flex-start",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Seleccionar espacio</span>
        <button onClick={onClose} style={{
          border: "none", background: "none", fontSize: 20,
          cursor: "pointer", color: "#888", lineHeight: 1, padding: 0,
        }}>×</button>
      </div>

      {/* Etiqueta parqueo */}
      <div style={{
        border: "1px solid #ddd", borderRadius: 6, padding: "8px 12px",
        marginBottom: 12, fontWeight: 600, fontSize: 14,
        display: "flex", justifyContent: "space-between",
      }}>
        <span>{parqueo.label}</span>
        <span style={{ color: "#888", fontSize: 12, alignSelf: "center" }}>Zona {parqueo.zone}</span>
      </div>

      {/* Grid de espacios */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
        gap: 5, marginBottom: 14, maxHeight: 320, overflowY: "auto",
      }}>
        {zoneSpaces.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#aaa", fontSize: 12, padding: "20px 0" }}>
            Sin espacios registrados
          </div>
        ) : zoneSpaces.map((sp) => {
          const num = sp.code.split("-")[1] || sp.code;
          return (
            <div key={sp.id}
              onClick={() => {
                setSelectedSpace(sp);
                onSpaceClick?.(sp);
              }}
              title={`${sp.code} — ${sp.status}`}
              style={{
                background: spaceColor(sp),
                color: "#fff",
                borderRadius: 4, fontSize: 11, fontWeight: 700,
                textAlign: "center", padding: "5px 2px",
                cursor: sp.status === "OCCUPIED" ? "not-allowed" : "pointer",
                opacity: sp.status === "MAINTENANCE" ? 0.55 : 1,
              }}>
              {num}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 10px", fontSize: 11, color: "#555" }}>
        {[
          ["#21ba45", "Disponible"],
          ["#db2828", "Ocupado"],
          ["#1678c2", "Seleccionado"],
          ["#fbbd08", "Reservado"],
          ["#7d8490", "No disponible"],
        ].map(([c, l]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 12, background: c, borderRadius: 2, display: "inline-block", flexShrink: 0 }} />{l}
          </span>
        ))}
      </div>

      {/* Espacio seleccionado */}
      {selectedSpace && (
        <div style={{ marginTop: 12, padding: "10px 12px", background: "#f4f6fb", borderRadius: 7 }}>
          <div style={{ fontWeight: 700, color: "#800020", marginBottom: 4 }}>{selectedSpace.code}</div>
          <div style={{ fontSize: 12, color: "#555" }}>
            Estado: <strong>{selectedSpace.status}</strong><br />
            Tipo: {selectedSpace.type}
          </div>
        </div>
      )}
    </div>
  );
}

function CampusMap({ zoneStats, spaces, onSpaceClick }) {
  const [hovered, setHovered]      = useState(null);
  const [activeParqueo, setActive] = useState(null);
  const [tooltip, setTooltip]      = useState({ x: 0, y: 0 });

  const handleMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: (e.clientX - r.left) * (1536 / r.width),
      y: (e.clientY - r.top)  * (1024 / r.height),
    });
  };

  const hovP = PARQUEOS.find(p => p.id === hovered);

  return (
    <div style={{ position: "relative" }}>
      {/* SVG mapa */}
      <div>
        <svg
          viewBox="0 0 1536 1024"
          style={{ width: "100%", borderRadius: 8, display: "block" }}
          onMouseMove={handleMove}
        >
          <defs>
            <filter id="lbl-shadow">
              <feDropShadow dx="0" dy="1" stdDeviation="3" floodOpacity="0.9" />
            </filter>
          </defs>

          {/* Imagen satelital de fondo */}
          <image href="/mapa-campus-real.png" x={0} y={0} width={1536} height={1024}
            preserveAspectRatio="xMidYMid slice" />

          {/* Polígonos de los 6 parqueos */}
          {PARQUEOS.map(({ id, zone, label, pts, lx, ly }) => {
            const zs   = zoneStats[zone] || {};
            const pct  = zs.total ? Math.round(((zs.occupied || 0) / zs.total) * 100) : 0;
            const isHov = hovered === id;
            const isAct = activeParqueo?.id === id;

            return (
              <g key={id}
                onMouseEnter={() => setHovered(id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setActive(isAct ? null : { id, zone, label })}
                style={{ cursor: "pointer" }}>

                <polygon
                  points={pts}
                  fill={isHov || isAct ? "#db2828" : "transparent"}
                  fillOpacity={isHov || isAct ? 0.25 : 0}
                  stroke="none"
                />

                {/* Etiqueta roja */}
                <rect x={lx - 62} y={ly - 28} width={124} height={50} rx={8}
                  fill="rgba(180,0,30,0.90)" />
                <text x={lx} y={ly - 10} textAnchor="middle"
                  fill="#fff" fontSize={16} fontWeight={800}
                  filter="url(#lbl-shadow)">
                  {label}
                </text>
                <text x={lx} y={ly + 10} textAnchor="middle"
                  fill={zs.available > 0 ? "#7ef0a0" : "#ffbaba"} fontSize={13} fontWeight={700}>
                  {zs.total ?? "—"} espacios
                </text>
              </g>
            );
          })}

          {/* ENTRADA */}
          <g>
            <rect x={692} y={938} width={182} height={62} rx={12} fill="#21ba45" fillOpacity={0.94} />
            <text x={783} y={962} textAnchor="middle" fill="#fff" fontSize={14} fontWeight={800}>ENTRADA</text>
            <text x={783} y={981} textAnchor="middle" fill="#fff" fontSize={12}>A LA UNIVERSIDAD</text>
            <polygon points="783,1006 797,990 769,990" fill="#fff" opacity={0.9} />
          </g>

          {/* SALIDA */}
          <g>
            <rect x={508} y={938} width={168} height={62} rx={12} fill="#f2711c" fillOpacity={0.94} />
            <text x={592} y={962} textAnchor="middle" fill="#fff" fontSize={14} fontWeight={800}>SALIDA</text>
            <text x={592} y={981} textAnchor="middle" fill="#fff" fontSize={12}>DE LA UNIVERSIDAD</text>
            <polygon points="592,1006 606,990 578,990" fill="#fff" opacity={0.9} />
          </g>

          {/* Rosa de los vientos */}
          <g transform="translate(1490,55)">
            <circle cx={0} cy={0} r={30} fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
            <polygon points="0,-22 5,-10 -5,-10" fill="#fff" opacity={0.9} />
            <text x={0} y={7} textAnchor="middle" fill="#fff" fontSize={14} fontWeight={900}>N</text>
            <polygon points="0,22 5,10 -5,10" fill="rgba(255,255,255,0.3)" />
          </g>

          {/* Tooltip al hacer hover */}
          {hovP && (() => {
            const zs   = zoneStats[hovP.zone] || {};
            const pct  = zs.total ? Math.round(((zs.occupied || 0) / zs.total) * 100) : 0;
            const fill = zoneColor(pct);
            const tx = Math.min(tooltip.x + 20, 1340);
            const ty = Math.max(tooltip.y - 120, 8);
            return (
              <g pointerEvents="none">
                <rect x={tx} y={ty} width={190} height={96} rx={10}
                  fill="rgba(10,10,18,0.94)" stroke={fill} strokeWidth={2} />
                <text x={tx + 95} y={ty + 22} textAnchor="middle" fill="#fff" fontSize={15} fontWeight={800}>
                  {hovP.label}
                </text>
                <text x={tx + 95} y={ty + 50} textAnchor="middle" fill={fill} fontSize={24} fontWeight={900}>
                  {pct}%
                </text>
                <text x={tx + 95} y={ty + 68} textAnchor="middle" fill="#aaa" fontSize={12}>ocupado</text>
                <text x={tx + 95} y={ty + 85} textAnchor="middle" fill="#888" fontSize={11}>
                  {zs.available ?? 0} libres · {zs.occupied ?? 0} ocupados
                </text>
              </g>
            );
          })()}
        </svg>

        {/* Leyenda inferior */}
        <div style={{ display: "flex", gap: 18, marginTop: 8, fontSize: 12, color: "#7d8490", flexWrap: "wrap" }}>
          {[["#21ba45", "< 60% Disponible"], ["#fbbd08", "60–85% Moderado"], ["#db2828", "> 85% Lleno"]].map(([c, l]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 12, height: 12, background: c, borderRadius: 2, display: "inline-block" }} />{l}
            </span>
          ))}
          <span style={{ marginLeft: "auto", color: "#7d8490" }}>
            <i className="fa fa-mouse-pointer" style={{ marginRight: 4 }} />
            Click en un parqueo para ver sus espacios
          </span>
        </div>
      </div>

      {/* Panel flotante sobre el mapa */}
      {activeParqueo && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          zIndex: 10, maxHeight: "calc(100% - 16px)", overflowY: "auto",
        }}>
          <SpacePanel
            parqueo={activeParqueo}
            zoneSpaces={spaces[activeParqueo.zone] || []}
            onClose={() => setActive(null)}
            onSpaceClick={onSpaceClick}
          />
        </div>
      )}
    </div>
  );
}

// ── Página principal del mapa ─────────────────────────────────────────────────
export default function MapaParqueo() {
  const [spaces, setSpaces]         = useState({ A: [], B: [], C: [], D: [] });
  const [zoneStats, setZoneStats]   = useState({});
  const [selected, setSelected]     = useState(null);
  const [assigning, setAssigning]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown]   = useState(20);

  const load = useCallback(async () => {
    try {
      const [spacesRes, statusRes, sessionsRes] = await Promise.all([
        api.get("/spaces?limit=600"),
        api.get("/spaces/status"),
        api.get("/sessions/active"),
      ]);

      const allSpaces = spacesRes.data.data || [];
      const activeSessions = sessionsRes.data.data?.sessions || [];

      const sessMap = {};
      activeSessions.forEach(s => { sessMap[s.space_id] = s; });

      const grouped = { A: [], B: [], C: [], D: [] };
      allSpaces.forEach(sp => {
        if (grouped[sp.zone] !== undefined) {
          grouped[sp.zone].push({ ...sp, _session: sessMap[sp.id] || null });
        }
      });

      setSpaces(grouped);
      setZoneStats(statusRes.data.data?.by_zone || {});
      setLastUpdate(new Date());
      setCountdown(20);
    } catch (e) {
      console.error("Error cargando mapa:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSpaceClick = (sp) => setSelected(sp);
  const handleAssignClick = (sp) => { setSelected(null); setAssigning(sp); };
  const handleAssignDone  = () => { setAssigning(null); load(); };

  const totalStats = Object.values(zoneStats).reduce(
    (acc, z) => ({
      total: acc.total + (z.total || 0),
      available: acc.available + (z.available || 0),
      occupied: acc.occupied + (z.occupied || 0),
    }),
    { total: 0, available: 0, occupied: 0 }
  );

  if (loading) return (
    <div className="text-center" style={{ padding: "3rem" }}>
      <i className="fa fa-spinner fa-spin fa-2x" style={{ color: "#800020" }} />
    </div>
  );

  return (
    <>
      <div className="row clearfix">
        {/* Panel lateral izquierdo */}
        <div className="col-lg-3 col-md-12">
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div className="card-header">
              <h3 className="card-title"><i className="fa fa-map" style={{ marginRight: 6 }} />Resumen campus</h3>
            </div>
            <div className="card-body" style={{ padding: "1rem" }}>
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#800020", lineHeight: 1 }}>
                  {totalStats.available}
                </div>
                <div style={{ fontSize: 12, color: "#7d8490" }}>espacios disponibles</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, height: 10, overflow: "hidden", marginBottom: 8 }}>
                <div style={{
                  width: `${totalStats.total ? Math.round((totalStats.occupied / totalStats.total) * 100) : 0}%`,
                  height: "100%", background: "#db2828", borderRadius: 6,
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#7d8490" }}>
                <span>{totalStats.occupied} ocupados</span>
                <span>{totalStats.total} total</span>
              </div>
            </div>
          </div>

          {["A", "B", "C", "D"].map(z => {
            const zs = zoneStats[z] || {};
            const pct = zs.total ? Math.round(((zs.occupied || 0) / zs.total) * 100) : 0;
            const color = pct > 85 ? "#db2828" : pct > 60 ? "#fbbd08" : "#21ba45";
            return (
              <div className="card" key={z} style={{ marginBottom: "0.75rem" }}>
                <div className="card-body" style={{ padding: "0.85rem 1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Zona {z}</span>
                    <span style={{ fontSize: 12, color, fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, margin: "6px 0", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#7d8490" }}>
                    <span><span style={{ color: "#21ba45" }}>●</span> {zs.available || 0}</span>
                    <span><span style={{ color: "#db2828" }}>●</span> {zs.occupied || 0}</span>
                    <span style={{ color: "#7d8490" }}>{zs.total || 0} total</span>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: 13 }}>Leyenda</h3>
            </div>
            <div className="card-body" style={{ padding: "0.75rem 1rem" }}>
              {[
                ...Object.entries(STATUS_COLOR).map(([, v]) => ({ color: v.fill, label: v.label })),
                { color: TYPE_OVERRIDE.HANDICAPPED.fill, label: TYPE_OVERRIDE.HANDICAPPED.label },
                { color: TYPE_OVERRIDE.ELECTRIC.fill,    label: TYPE_OVERRIDE.ELECTRIC.label    },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 14, height: 14, background: color, borderRadius: 3, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#7d8490" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {lastUpdate && (
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <p style={{ fontSize: 11, color: "#7d8490", marginBottom: 4 }}>
                <i className="fa fa-refresh" style={{ marginRight: 4 }} />
                Actualizado {lastUpdate.toLocaleTimeString("es-GT")}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                <div style={{ flex: 1, maxWidth: 100, background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 4, overflow: "hidden" }}>
                  <div style={{
                    width: `${(countdown / 20) * 100}%`, height: "100%", borderRadius: 4,
                    background: countdown <= 5 ? "#db2828" : countdown <= 10 ? "#fbbd08" : "#21ba45",
                    transition: "width 1s linear, background 0.3s",
                  }} />
                </div>
                <span style={{ fontSize: 10, color: "#7d8490" }}>{countdown}s</span>
              </div>
            </div>
          )}
        </div>

        {/* Mapa */}
        <div className="col-lg-9 col-md-12">
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="card-title">
                <i className="fa fa-map-o" style={{ marginRight: 6 }} />
                Plano de parqueo — Campus Central USPG
              </h3>
              <button className="btn btn-default btn-sm" onClick={load}>
                <i className="fa fa-refresh" />
              </button>
            </div>
            <div className="card-body" style={{ padding: "1rem" }}>
              <CampusMap
                zoneStats={zoneStats}
                spaces={spaces}
                onSpaceClick={handleSpaceClick}
              />
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <SpaceModal
          space={selected}
          onClose={() => setSelected(null)}
          onAssign={handleAssignClick}
          onStatusChange={() => { setSelected(null); load(); }}
        />
      )}
      {assigning && (
        <AssignModal
          space={assigning}
          onClose={() => setAssigning(null)}
          onSubmit={handleAssignDone}
        />
      )}
    </>
  );
}
