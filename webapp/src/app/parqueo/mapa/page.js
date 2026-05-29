"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import QRCode from "qrcode";

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
function SpaceModal({ space, canManage, tariffs, onClose, onAssign, onStatusChange, onPayRequired }) {
  const [toggling,  setToggling]  = useState(false);
  const [exiting,   setExiting]   = useState(false);
  const [toggleMsg, setToggleMsg] = useState("");

  if (!space) return null;
  const session    = space._session;
  const isOccupied = space.status === "OCCUPIED";
  const isMaint    = space.status === "MAINTENANCE";
  const dur = session
    ? Math.floor((Date.now() - new Date(session.entry_time).getTime()) / 60000)
    : 0;

  const rate = (() => {
    const t = tariffs?.[session?.user?.role];
    if (!t) return 5;
    if (t.is_free) {
      if (!t.max_free_hours) return 0;
      return (dur / 60) <= t.max_free_hours ? 0 : t.hourly_rate;
    }
    return t.hourly_rate;
  })();
  const monto = session ? ((dur / 60) * rate).toFixed(2) : "0.00";

  const registerExit = async () => {
    if (!session?.id) return;
    setExiting(true); setToggleMsg("");
    try {
      // Primero calcular el monto sin confirmar (dry-run)
      const r = await api.get(`/sessions/${session.id}/checkout`);
      const calc = r.data.data;
      if (calc.amount_due > 0 && !calc.is_paid) {
        // Hay pago pendiente → abrir modal de pago; espacio NO se libera aún
        onPayRequired?.({ ...calc, id: session.id, vehicle: session.vehicle, user: session.user });
        onClose();
      } else {
        // Gratis o ya pagado → checkout directo
        await api.post(`/sessions/${session.id}/checkout`, {});
        onStatusChange?.();
        onClose();
      }
    } catch (e) {
      setToggleMsg(e.response?.data?.message || "Error al calcular salida.");
      setExiting(false);
    }
  };

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
            <button type="button" style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1, padding:"0 0 0 12px", fontWeight:300 }} onClick={onClose}><span>&times;</span></button>
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
            ) : space.status === "RESERVED" ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <i className="fa fa-calendar-times-o fa-3x" style={{ color: "#fbbd08", display: "block", marginBottom: 12 }} />
                <p style={{ color: "#555", fontWeight: 600, marginBottom: 4 }}>Espacio reservado para evento</p>
                <p style={{ color: "#7d8490", fontSize: 12, marginBottom: 0 }}>
                  Este espacio está bloqueado y no puede asignarse.
                </p>
              </div>
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
            {canManage && isOccupied && session && (
              <button className="btn btn-danger btn-sm" onClick={registerExit} disabled={exiting}>
                {exiting
                  ? <i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />
                  : <i className="fa fa-sign-out" style={{ marginRight: 6 }} />}
                Registrar salida
              </button>
            )}
            {canManage && !isOccupied && !isMaint && space.status !== "RESERVED" && (
              <button className="btn btn-success btn-sm" onClick={() => onAssign(space)}>
                <i className="fa fa-plus" style={{ marginRight: 6 }} />Asignar manualmente
              </button>
            )}
            {canManage && !isOccupied && space.status !== "RESERVED" && (
              <button className="btn btn-warning btn-sm" onClick={toggleMaintenance} disabled={toggling}
                style={{ background: isMaint ? "#21ba45" : "#fbbd08", borderColor: isMaint ? "#1a9438" : "#d4a007", color: "#fff" }}>
                {toggling
                  ? <i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />
                  : <i className={`fa ${isMaint ? "fa-check" : "fa-wrench"}`} style={{ marginRight: 6 }} />}
                {isMaint ? "Marcar disponible" : "Poner en mantenimiento"}
              </button>
            )}
            {!canManage && (
              <span style={{ fontSize: 11, color: "#7d8490", fontStyle: "italic" }}>
                <i className="fa fa-lock" style={{ marginRight: 4 }} />Solo lectura
              </span>
            )}
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Input de placa con auto-formato ──────────────────────────────────────────
function PlacaInput({ value, onChange, placeholder = "P-123ABC", className = "form-control" }) {
  // Formato Guatemala: X-000XXX (1 letra, guión, 3 dígitos, 3 letras)
  const format = (raw) => {
    const clean = raw.toUpperCase().replace(/-/g, "").replace(/[^A-Z0-9]/g, "");
    let result = "";
    for (let i = 0; i < clean.length && i < 7; i++) {
      const c = clean[i];
      if (i === 0 && /[A-Z]/.test(c))               result += c;
      else if (i >= 1 && i <= 3 && /[0-9]/.test(c)) result += c;
      else if (i >= 4 && i <= 6 && /[A-Z]/.test(c)) result += c;
    }
    return result.length > 1 ? result[0] + "-" + result.slice(1) : result;
  };
  const isValid = value.length === 8; // P-123ABC
  return (
    <div style={{ position: "relative" }}>
      <input className={className} placeholder={placeholder} value={value} maxLength={10}
        onChange={e => onChange(format(e.target.value))}
        style={{ paddingRight: 32, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}
      />
      {value.length > 0 && (
        <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: isValid ? "#21ba45" : "#fbbd08" }}>
          <i className={`fa ${isValid ? "fa-check" : "fa-pencil"}`} />
        </span>
      )}
    </div>
  );
}

// ── Modal pago post-salida (desde el mapa) ────────────────────────────────────
const METODOS_PAGO = [
  { value: "CASH",     label: "Efectivo",      icon: "fa-money"          },
  { value: "CARD",     label: "Tarjeta",        icon: "fa-credit-card"    },
  { value: "TRANSFER", label: "Transferencia",  icon: "fa-exchange"       },
  { value: "QR",       label: "QR / Billetera", icon: "fa-qrcode"         },
];

function PagoMapaModal({ session, onClose, onDone }) {
  const [metodo,  setMetodo]  = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  if (!session) return null;
  const monto = (session.amount_due ?? 0).toFixed(2);

  const confirmar = async () => {
    setLoading(true); setError("");
    try {
      // checkout atómico: exit + pago + liberar espacio
      await api.post(`/sessions/${session.id}/checkout`, { payment_method: metodo });
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || "Error al procesar pago.");
      setLoading(false);
    }
  };

  return (
    <div className="modal" style={{ display:"flex", position:"fixed", inset:0, zIndex:1070,
      background:"rgba(0,0,0,0.75)", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth:380, width:"100%", margin:0 }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header" style={{ borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
            <h5 className="modal-title" style={{ color:"#800020" }}>
              <i className="fa fa-money" style={{ marginRight:8 }} />Cobrar pago
            </h5>
            <button style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1, padding:"0 0 0 12px", fontWeight:300 }} onClick={onClose}><span>&times;</span></button>
          </div>
          <div className="modal-body">
            <div style={{ textAlign:"center", marginBottom:16 }}>
              <div style={{ fontSize:36, fontWeight:800, color:"#800020" }}>Q {monto}</div>
              <div style={{ fontSize:12, color:"#7d8490" }}>
                {session.vehicle?.placa} · {session.user?.first_name} {session.user?.last_name}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {METODOS_PAGO.map(m => (
                <button key={m.value}
                  className={`btn btn-sm ${metodo === m.value ? "btn-primary" : "btn-outline-secondary"}`}
                  style={{ fontWeight:600, padding:"10px 0",
                    background: metodo===m.value ? "#800020" : undefined,
                    borderColor: metodo===m.value ? "#800020" : undefined }}
                  onClick={() => setMetodo(m.value)}>
                  <i className={`fa ${m.icon}`} style={{ marginRight:6 }} />{m.label}
                </button>
              ))}
            </div>
            {error && <p style={{ color:"#db2828", fontSize:12, marginTop:8, marginBottom:0 }}>{error}</p>}
          </div>
          <div className="modal-footer" style={{ borderTop:"1px solid rgba(255,255,255,0.08)" }}>
            <button className="btn btn-success" disabled={loading} onClick={confirmar}
              style={{ background:"#21ba45", borderColor:"#1a9438", fontWeight:700 }}>
              {loading ? <i className="fa fa-spinner fa-spin" style={{ marginRight:6 }} /> : <i className="fa fa-check" style={{ marginRight:6 }} />}
              Confirmar pago Q {monto}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal asignación manual ────────────────────────────────────────────────────
function TicketEntradaModal({ session, space, onClose }) {
  const canvasRef  = useRef(null);
  const realEmail  = session?.user?.email && !session.user.email.includes("@uspg.local")
    ? session.user.email : "";
  const [email,    setEmail]    = useState(realEmail);
  const [sending,  setSending]  = useState(false);
  const [emailOk,  setEmailOk]  = useState(false);
  const [emailErr, setEmailErr] = useState("");

  useEffect(() => {
    if (!canvasRef.current || !session?.session_code) return;
    QRCode.toCanvas(canvasRef.current, session.session_code, {
      width: 180, margin: 1, color: { dark: "#1a1a2e", light: "#ffffff" },
    });
  }, [session]);

  const sendEmail = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr("Ingresa un correo válido."); return;
    }
    setSending(true); setEmailErr("");
    try {
      const qrImageBase64 = canvasRef.current?.toDataURL("image/png") ?? null;
      const now = new Date(session.entry_time ?? Date.now());
      await fetch("/api/parqueo/qr/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          qrImageBase64,
          reservation: {
            id:                 session.session_code,
            spaceCode:          space?.code ?? "—",
            zone:               space?.zone ?? "—",
            type:               "MANUAL_ENTRY",
            eventName:          null,
            startTime:          now.toISOString(),
            endTime:            null,
            startTimeFormatted: now.toLocaleString("es-GT"),
            endTimeFormatted:   "—",
          },
        }),
      }).then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Error al enviar.");
        setEmailOk(true);
      });
    } catch (e) {
      setEmailErr(e.message);
    } finally {
      setSending(false);
    }
  };

  if (!session) return null;
  const nombre = session.user ? `${session.user.first_name} ${session.user.last_name}` : "Visitante";

  return (
    <div className="modal" style={{ display:"flex", position:"fixed", inset:0, zIndex:1070,
      background:"rgba(0,0,0,0.8)", alignItems:"center", justifyContent:"center" }}>
      <div className="modal-dialog" style={{ maxWidth:380, width:"100%", margin:0 }}>
        <div className="modal-content" style={{ borderRadius:12, overflow:"hidden" }}>
          <div style={{ background:"linear-gradient(135deg,#800020,#a00028)", padding:"16px 20px" }}>
            <div style={{ color:"#fff", fontWeight:800, fontSize:16 }}>
              <i className="fa fa-ticket" style={{ marginRight:8 }} />Ticket de entrada
            </div>
            <div style={{ color:"rgba(255,255,255,0.75)", fontSize:12, marginTop:2 }}>
              {session.vehicle?.placa} · Espacio {space?.code} · {nombre}
            </div>
          </div>
          <div className="modal-body" style={{ textAlign:"center", padding:"20px" }}>
            <div style={{ display:"inline-block", padding:8, background:"#fff", borderRadius:8, boxShadow:"0 2px 12px rgba(0,0,0,0.2)", marginBottom:12 }}>
              <canvas ref={canvasRef} />
            </div>
            <div style={{ fontSize:13, color:"#7d8490", marginBottom:4 }}>Código de sesión</div>
            <div style={{ fontSize:36, fontWeight:900, letterSpacing:6, color:"#800020", fontFamily:"monospace" }}>
              {session.session_code}
            </div>
            <div style={{ marginTop:12, padding:"10px 14px", background:"rgba(33,186,69,0.08)", borderRadius:8, fontSize:12, color:"#7d8490", textAlign:"left" }}>
              <i className="fa fa-info-circle" style={{ marginRight:6, color:"#21ba45" }} />
              Presenta este código o QR al pagar. Si pagas antes de salir, la salida es inmediata.
            </div>

            {/* Envío por correo */}
            <div style={{ borderTop:"1px solid rgba(255,255,255,0.08)", marginTop:16, paddingTop:14, textAlign:"left" }}>
              <label style={{ fontSize:12, fontWeight:600, color:"#7d8490", display:"block", marginBottom:6 }}>
                <i className="fa fa-envelope" style={{ marginRight:6 }} />
                Enviar QR por correo
              </label>
              {emailOk ? (
                <div style={{ color:"#21ba45", fontSize:13, textAlign:"center", padding:"6px 0" }}>
                  <i className="fa fa-check-circle" style={{ marginRight:6 }} />
                  Enviado a <strong>{email}</strong>
                </div>
              ) : (
                <div style={{ display:"flex", gap:6 }}>
                  <input
                    type="email"
                    className="form-control form-control-sm"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailErr(""); }}
                    onKeyDown={e => e.key === "Enter" && sendEmail()}
                    style={{ flex:1 }}
                  />
                  <button
                    className="btn btn-info btn-sm"
                    onClick={sendEmail}
                    disabled={sending}
                    style={{ flexShrink:0, padding:"0 14px" }}
                  >
                    {sending
                      ? <i className="fa fa-spinner fa-spin" />
                      : <i className="fa fa-paper-plane" />}
                  </button>
                </div>
              )}
              {emailErr && (
                <p style={{ color:"#db2828", fontSize:11, marginTop:4, marginBottom:0 }}>{emailErr}</p>
              )}
            </div>
          </div>
          <div className="modal-footer" style={{ borderTop:"1px solid rgba(255,255,255,0.08)", justifyContent:"center" }}>
            <button className="btn btn-primary" onClick={onClose}
              style={{ background:"#800020", borderColor:"#800020", fontWeight:600 }}>
              <i className="fa fa-check" style={{ marginRight:6 }} />Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignModal({ space, onClose, onSubmit }) {
  const [plate,     setPlate]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [found,     setFound]     = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ first_name: "", last_name: "", phone: "", brand: "", model: "", color: "" });
  const [registering, setRegistering] = useState(false);
  const [ticket, setTicket] = useState(null);

  const searchVehicle = async () => {
    if (!plate.trim()) return;
    setMsg(""); setFound(null); setVehicleId(""); setShowRegister(false);
    try {
      const res = await api.get(`/vehicles/search?plate=${plate.toUpperCase()}`);
      const v = res.data.data;
      setFound(v); setVehicleId(v.id);
    } catch {
      setMsg("Vehículo no encontrado. Registra al visitante.");
      setShowRegister(true);
    }
  };

  const registerVisitor = async () => {
    if (!plate.trim() || !regForm.first_name.trim()) {
      setMsg("Placa y nombre son requeridos."); return;
    }
    setRegistering(true); setMsg("");
    try {
      const placaClean = plate.toUpperCase().replace(/\s/g, "");
      // Email único por UUID para evitar conflictos si el visitante regresa
      const uniqueEmail = `v-${placaClean.toLowerCase()}-${crypto.randomUUID().slice(0,8)}@uspg.local`;
      const userRes = await api.post("/users", {
        first_name: regForm.first_name.trim(),
        last_name:  regForm.last_name.trim() || "Visitante",
        email:      uniqueEmail,
        password:   crypto.randomUUID(),
        role:       "VISITOR",
        phone:      regForm.phone?.trim() || null,
        is_active:  true,
      });
      const userId = userRes.data.data?.id;
      if (!userId) throw new Error("No se pudo crear el visitante.");

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
      const r = await api.post("/sessions", { vehicle_id: vehicleId, space_id: space.id, entry_method: "MANUAL" });
      setTicket(r.data.data); // mostrar ticket con QR + código
    } catch (e) {
      setMsg(e.response?.data?.message || "Error al registrar entrada.");
    } finally { setLoading(false); }
  };

  return (
    <>
    <div className="modal" style={{
      display: "flex", position: "fixed", inset: 0, zIndex: 1060,
      background: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: 420, width: "100%", margin: 0 }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" style={{ color: "#800020" }}>Asignar espacio {space.code}</h5>
            <button style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1, padding:"0 0 0 12px", fontWeight:300 }} onClick={onClose}><span>&times;</span></button>
          </div>
          <div className="modal-body">

            {/* Búsqueda por placa */}
            <div className="form-group">
              <label style={{ fontSize: 13, fontWeight: 600 }}>Buscar por placa</label>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <PlacaInput value={plate}
                    onChange={v => { setPlate(v); setMsg(""); setFound(null); setVehicleId(""); setShowRegister(false); }}
                  />
                </div>
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
                    <input className="form-control form-control-sm" placeholder="55551234"
                      value={regForm.phone}
                      inputMode="numeric"
                      maxLength={8}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                        setRegForm(f => ({ ...f, phone: val }));
                      }}
                    />
                    {regForm.phone.length > 0 && regForm.phone.length < 8 && (
                      <small style={{ color: "#fbbd08" }}>{8 - regForm.phone.length} dígitos restantes</small>
                    )}
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

    {ticket && (
      <TicketEntradaModal
        session={ticket}
        space={space}
        onClose={() => { setTicket(null); onSubmit(); }}
      />
    )}
    </>
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
    id: "P5", zone: "A", label: "Zona A · Norte",
    pts: "631.613,17.504 714.758,62.724 612.65,195.464 526.587,134.199",
    lx: 621, ly: 102,
  },
  {
    id: "P1", zone: "A", label: "Zona A · Oeste",
    pts: "224.638,627.236 423.02,285.903 504.707,339.875 309.242,681.208",
    lx: 365, ly: 483,
  },
  {
    id: "P2", zone: "B", label: "Zona B · Sur",
    pts: "468.239,590.769 666.621,694.336 625.778,761.436 433.231,643.282",
    lx: 548, ly: 672,
  },
  {
    id: "P6", zone: "B", label: "Zona B · Este",
    pts: "781.858,633.071 986.074,590.769 1059.01,809.573 951.066,951.066 853.333,933.561 748.308,816.866 723.51,697.254",
    lx: 871, ly: 790,
  },
  {
    id: "P3", zone: "C", label: "Zona C",
    pts: "1117.36,463.863 1184.46,516.376 1080.89,637.447 1018.17,577.641",
    lx: 1100, ly: 548,
  },
  {
    id: "P4", zone: "D", label: "Zona D",
    pts: "1204.88,554.302 1277.81,602.439 1153.82,774.564 1075.05,710.382",
    lx: 1178, ly: 660,
  },
];

function zoneColor(pct) {
  if (pct > 85) return "#db2828";
  if (pct > 60) return "#fbbd08";
  return "#21ba45";
}

// Asigna un espacio a su sub-parqueo según zona y número de código
function parqueoIdOfSpace(sp) {
  const num = parseInt((sp.code || "").replace(/[^0-9]/g, ""), 10) || 0;
  const zoneSpaceCount = { A: 125, B: 125, C: 125, D: 125 };
  const half = Math.floor((zoneSpaceCount[sp.zone] || 125) / 2);
  if (sp.zone === "A") return num <= half ? "P5" : "P1"; // Norte / Oeste
  if (sp.zone === "B") return num <= half ? "P2" : "P6"; // Sur / Este
  if (sp.zone === "C") return "P3";
  if (sp.zone === "D") return "P4";
  return null;
}

// Calcula stats por sub-parqueo a partir de los espacios reales
function computeParqueoStats(spaces) {
  const stats = {};
  Object.values(spaces).flat().forEach(sp => {
    const pid = parqueoIdOfSpace(sp);
    if (!pid) return;
    if (!stats[pid]) stats[pid] = { total: 0, available: 0, occupied: 0 };
    stats[pid].total++;
    if (sp.status === "OCCUPIED") stats[pid].occupied++;
    else if (sp.status === "AVAILABLE") stats[pid].available++;
  });
  return stats;
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
          const isBlocked = sp.status === "OCCUPIED" || sp.status === "RESERVED" || sp.status === "MAINTENANCE";
          return (
            <div key={sp.id}
              onClick={() => {
                if (isBlocked) return;
                setSelectedSpace(sp);
                onSpaceClick?.(sp);
              }}
              title={`${sp.code} — ${sp.status}${sp.status === "RESERVED" ? " (reservado para evento)" : ""}`}
              style={{
                background: spaceColor(sp),
                color: "#fff",
                borderRadius: 4, fontSize: 11, fontWeight: 700,
                textAlign: "center", padding: "5px 2px",
                cursor: isBlocked ? "not-allowed" : "pointer",
                opacity: (sp.status === "MAINTENANCE" || sp.status === "RESERVED") ? 0.65 : 1,
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

function CampusMap({ zoneStats, spaces, parqueoStats, onSpaceClick }) {
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
            const ps  = parqueoStats[id] || { total: 0, available: 0, occupied: 0 };
            const pct = ps.total ? Math.round((ps.occupied / ps.total) * 100) : 0;
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
                  fill={ps.available > 0 ? "#7ef0a0" : "#ffbaba"} fontSize={13} fontWeight={700}>
                  {ps.total ?? "—"} espacios
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
            const ps   = parqueoStats[hovP.id] || { total: 0, available: 0, occupied: 0 };
            const pct  = ps.total ? Math.round((ps.occupied / ps.total) * 100) : 0;
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
                  {ps.available ?? 0} libres · {ps.occupied ?? 0} ocupados
                </text>
              </g>
            );
          })()}
        </svg>

        {/* Leyenda inferior */}
        <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 10 }}>
          <div style={{ display: "flex", gap: 18, fontSize: 12, color: "#7d8490", flexWrap: "wrap", alignItems: "center" }}>
            <strong style={{ color: "#adb5bd", fontSize: 11 }}>Ocupación:</strong>
            {[["#21ba45", "< 60% Disponible"], ["#fbbd08", "60–85% Moderado"], ["#db2828", "> 85% Lleno"]].map(([c, l]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 12, height: 12, background: c, borderRadius: 2, display: "inline-block" }} />{l}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 11, color: "#7d8490", marginTop: 6, flexWrap: "wrap" }}>
            <span><i className="fa fa-mouse-pointer" style={{ marginRight: 4, color: "#17a2b8" }} />Hover sobre un parqueo para ver estadísticas</span>
            <span><i className="fa fa-hand-o-up" style={{ marginRight: 4, color: "#800020" }} />Click en un parqueo para ver y gestionar espacios individuales</span>
            <span><i className="fa fa-circle" style={{ marginRight: 4, color: "#21ba45" }} />Verde = espacio libre · <i className="fa fa-circle" style={{ margin: "0 4px 0 6px", color: "#db2828" }} />Rojo = ocupado · <i className="fa fa-circle" style={{ margin: "0 4px 0 6px", color: "#7d8490" }} />Gris = mantenimiento</span>
          </div>
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
            zoneSpaces={(spaces[activeParqueo.zone] || []).filter(sp => parqueoIdOfSpace(sp) === activeParqueo.id)}
            onClose={() => setActive(null)}
            onSpaceClick={onSpaceClick}
          />
        </div>
      )}
    </div>
  );
}

function decodeJwt(token) {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}

// ── Página principal del mapa ─────────────────────────────────────────────────
export default function MapaParqueo() {
  const [spaces, setSpaces]         = useState({ A: [], B: [], C: [], D: [] });
  const [zoneStats, setZoneStats]   = useState({});
  const [selected, setSelected]     = useState(null);
  const [assigning, setAssigning]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown]   = useState(30);
  const [userRole, setUserRole]     = useState(null);
  const [tariffs,  setTariffs]      = useState({});
  const [pagoSession, setPagoSession] = useState(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const decoded = decodeJwt(token);
    setUserRole(decoded?.role || null);
  }, []);

  useEffect(() => {
    api.get("/tariffs").then(r => {
      const map = {};
      (r.data.data || []).forEach(t => { map[t.role] = t; });
      setTariffs(map);
    }).catch(() => {});
  }, []);

  // Solo ADMIN y SECURITY pueden asignar/poner en mantenimiento
  const canManage = userRole === "ADMIN" || userRole === "SECURITY";

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
      setCountdown(30);
    } catch (e) {
      console.error("Error cargando mapa:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSpaceClick = (sp) => setSelected(sp);
  const handleAssignClick = (sp) => { setSelected(null); setAssigning(sp); };
  const handleAssignDone  = () => { setAssigning(null); load(); };

  const parqueoStats = computeParqueoStats(spaces);

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

          {PARQUEOS.map(p => {
            const ps = parqueoStats[p.id] || { total: 0, available: 0, occupied: 0 };
            const { total, occupied, available } = ps;
            const pct  = total ? Math.round((occupied / total) * 100) : 0;
            const color = pct > 85 ? "#db2828" : pct > 60 ? "#fbbd08" : "#21ba45";
            return (
              <div className="card" key={p.id} style={{ marginBottom: "0.6rem" }}>
                <div className="card-body" style={{ padding: "0.75rem 1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{p.label}</span>
                    <span style={{ fontSize: 12, color, fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 5, margin: "5px 0", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#7d8490" }}>
                    <span><span style={{ color: "#21ba45" }}>●</span> {available}</span>
                    <span><span style={{ color: "#db2828" }}>●</span> {occupied}</span>
                    <span style={{ color: "#7d8490" }}>{total} total</span>
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
                parqueoStats={parqueoStats}
                onSpaceClick={handleSpaceClick}
              />
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <SpaceModal
          space={selected}
          canManage={canManage}
          tariffs={tariffs}
          onClose={() => setSelected(null)}
          onAssign={handleAssignClick}
          onStatusChange={() => { setSelected(null); load(); }}
          onPayRequired={(sess) => { setSelected(null); setPagoSession(sess); }}
        />
      )}
      {pagoSession && (
        <PagoMapaModal
          session={pagoSession}
          onClose={() => setPagoSession(null)}
          onDone={() => { setPagoSession(null); load(); }}
        />
      )}
      {assigning && canManage && (
        <AssignModal
          space={assigning}
          onClose={() => setAssigning(null)}
          onSubmit={handleAssignDone}
        />
      )}
    </>
  );
}
