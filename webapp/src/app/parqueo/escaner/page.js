"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import api from "@/lib/api";

// ── Input de placa con auto-formato ──────────────────────────────────────────
function PlacaInput({ value, onChange, placeholder = "P-001ABC", className = "form-control form-control-sm" }) {
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

// ── Modal: Generar QR visitante ───────────────────────────────────────────────
function VisitorModal({ onClose }) {
  const [form, setForm]         = useState({ name: "", vehicle_plate: "", max_hours: 2, brand: "", model: "", color: "" });
  const [loading, setLoading]   = useState(false);
  const [qrData, setQrData]     = useState(null);
  const [error, setError]       = useState("");
  const [email, setEmail]       = useState("");
  const [sending, setSending]   = useState(false);
  const [emailOk, setEmailOk]   = useState(false);
  const [emailErr, setEmailErr] = useState("");

  const generar = async () => {
    if (!form.name.trim()) { setError("El nombre es obligatorio."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/qr/visitor", {
        visitor_name:  form.name.trim(),
        vehicle_plate: form.vehicle_plate.trim() || "N/A",
        valid_hours:   Number(form.max_hours),
        vehicle_brand: form.brand.trim() || null,
        vehicle_model: form.model.trim() || null,
        vehicle_color: form.color.trim() || null,
      });
      setQrData(res.data.data);
    } catch (e) {
      setError(e.response?.data?.message || "Error al generar el QR. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr("Ingresa un correo válido."); return;
    }
    setSending(true); setEmailErr("");
    try {
      const now     = new Date();
      const expires = new Date(now.getTime() + form.max_hours * 3600000);
      const res = await fetch("/api/parqueo/qr/send-email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          // qrImageBase64 le dice al route que use esta imagen directamente
          // en lugar de regenerar el QR — así el email muestra exactamente
          // el mismo código que está en pantalla
          qrImageBase64: qrData.qr_image || null,
          reservation: {
            id:                 qrData.qr_code || qrData.code || "VISITA",
            spaceCode:          qrData.space_code || "Visitante",
            zone:               qrData.zone || "—",
            type:               "SPECIAL_VISIT",
            eventName:          null,
            startTime:          now.toISOString(),
            endTime:            expires.toISOString(),
            startTimeFormatted: now.toLocaleString("es-GT"),
            endTimeFormatted:   expires.toLocaleString("es-GT"),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar.");
      setEmailOk(true);
    } catch (e) {
      setEmailErr(e.message);
    } finally {
      setSending(false);
    }
  };

  // qr_image ya viene como data URL del API — no se necesita librería externa

  return (
    <div className="modal" style={{
      display: "flex", position: "fixed", inset: 0, zIndex: 1060,
      background: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: 420, width: "100%", margin: 0 }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" style={{ color: "#800020" }}>
              <i className="fa fa-qrcode" style={{ marginRight: 8 }} />
              Generar QR visitante
            </h5>
            <button style={{ border:"none", background:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1, padding:"0 0 0 12px", fontWeight:300 }} onClick={onClose}><span>&times;</span></button>
          </div>
          <div className="modal-body">
            {!qrData ? (
              <>
                <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Nombre del visitante *</label>
                  <input className="form-control form-control-sm"
                    placeholder="Juan García"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Placa del vehículo <span style={{ color: "#7d8490", fontWeight: 400 }}>(opcional)</span></label>
                  <PlacaInput
                    value={form.vehicle_plate}
                    onChange={v => setForm(f => ({ ...f, vehicle_plate: v }))}
                    placeholder="ABC-123"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>Marca</label>
                    <input className="form-control form-control-sm" placeholder="Toyota"
                      value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>Modelo</label>
                    <input className="form-control form-control-sm" placeholder="Corolla"
                      value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>Color</label>
                    <input className="form-control form-control-sm" placeholder="Blanco"
                      value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Horas máximas</label>
                  <select className="form-control form-control-sm"
                    value={form.max_hours}
                    onChange={e => setForm(f => ({ ...f, max_hours: e.target.value }))}>
                    {[1, 2, 3, 4, 6, 8, 12].map(h => (
                      <option key={h} value={h}>{h} hora{h > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </div>
                {error && <p style={{ color: "#db2828", fontSize: 12 }}>{error}</p>}
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "inline-block", padding: 12, background: "#fff", borderRadius: 8, marginBottom: 12 }}>
                  {qrData.qr_image
                    ? <img src={qrData.qr_image} alt="QR" style={{ width: 180, height: 180, display: "block" }} />
                    : <i className="fa fa-qrcode" style={{ fontSize: 120, color: "#222" }} />}
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{qrData.visitor_name || qrData.name || form.name}</div>
                <div style={{ fontSize: 12, color: "#7d8490", marginBottom: 8 }}>
                  Válido por {form.max_hours} hora(s)
                  {qrData.expires_at && ` · Vence: ${new Date(qrData.expires_at).toLocaleTimeString("es-GT")}`}
                </div>
                <div style={{
                  background: "rgba(255,255,255,0.06)", borderRadius: 6,
                  padding: "6px 12px", fontSize: 11, color: "#7d8490",
                  wordBreak: "break-all", fontFamily: "monospace", marginBottom: 16,
                }}>
                  {(qrData.qr_code || qrData.code || qrData.token || qrData.id || "").slice(0, 40)}…
                </div>

                {/* Enviar por correo */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block", color: "#7d8490" }}>
                    <i className="fa fa-envelope" style={{ marginRight: 6 }} />
                    Enviar QR por correo
                  </label>
                  {emailOk ? (
                    <div style={{ color: "#21ba45", fontSize: 13, textAlign: "center" }}>
                      <i className="fa fa-check-circle" style={{ marginRight: 6 }} />
                      Correo enviado a <strong>{email}</strong>
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
                  {emailErr && <p style={{ color: "#db2828", fontSize: 11, marginTop: 4, marginBottom: 0 }}>{emailErr}</p>}
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            {!qrData ? (
              <button className="btn btn-primary btn-sm" onClick={generar} disabled={loading}>
                {loading
                  ? <i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />
                  : <i className="fa fa-qrcode" style={{ marginRight: 6 }} />}
                Generar QR
              </button>
            ) : (
              <>
                <button className="btn btn-default btn-sm" onClick={() => window.print()}>
                  <i className="fa fa-print" style={{ marginRight: 6 }} />Imprimir
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setQrData(null)}>
                  Nuevo QR
                </button>
              </>
            )}
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Panel de resultado del escaneo ────────────────────────────────────────────
function ResultPanel({ result, onClear }) {
  if (!result) return null;

  const isOk  = result.success;
  const color = isOk ? "#21ba45" : "#db2828";
  const icon  = isOk ? "fa-check-circle" : "fa-times-circle";
  const bg    = isOk ? "rgba(33,186,69,0.10)" : "rgba(219,40,40,0.10)";
  const border= isOk ? "#21ba45" : "#db2828";

  const d = result.data || {};
  const isEntry = d.action === "ENTRY" || result.type === "entry";
  const isExit  = d.action === "EXIT"  || result.type === "exit";

  return (
    <div style={{
      border: `2px solid ${border}`, borderRadius: 10,
      background: bg, padding: "1.5rem",
      animation: "fadeIn 0.3s ease",
    }}>
      {/* Icono grande */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <i className={`fa ${icon}`} style={{ fontSize: 64, color }} />
        <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 8 }}>
          {isOk
            ? isEntry ? "Entrada registrada" : isExit ? "Salida registrada" : "Acceso autorizado"
            : result.message || "Acceso denegado"}
        </div>
      </div>

      {isOk && (
        <table className="table table-sm" style={{ marginBottom: 0 }}>
          <tbody>
            {d.placa && (
              <tr><td style={{ color: "#7d8490", width: 140 }}>Placa</td>
                <td><strong style={{ color: "#800020", fontSize: 16 }}>{d.placa}</strong></td></tr>
            )}
            {d.owner_name && (
              <tr><td style={{ color: "#7d8490" }}>Propietario</td>
                <td><strong>{d.owner_name}</strong></td></tr>
            )}
            {d.space_code && (
              <tr><td style={{ color: "#7d8490" }}>Espacio</td>
                <td><span className="badge badge-default">{d.space_code}</span>
                  {d.zone && <span style={{ fontSize: 11, color: "#7d8490", marginLeft: 6 }}>Zona {d.zone}</span>}
                </td></tr>
            )}
            {isEntry && d.entry_time && (
              <tr><td style={{ color: "#7d8490" }}>Hora entrada</td>
                <td>{new Date(d.entry_time).toLocaleTimeString("es-GT")}</td></tr>
            )}
            {isExit && d.duration_minutes != null && (
              <tr><td style={{ color: "#7d8490" }}>Tiempo</td>
                <td><strong>{d.duration_minutes < 60 ? `${d.duration_minutes}m` : `${Math.floor(d.duration_minutes / 60)}h ${d.duration_minutes % 60}m`}</strong></td></tr>
            )}
            {isExit && d.amount_due != null && (
              <tr><td style={{ color: "#7d8490" }}>Monto</td>
                <td><strong style={{ color: "#21ba45", fontSize: 16 }}>Q {Number(d.amount_due).toFixed(2)}</strong></td></tr>
            )}
            {d.vehicle_type && (
              <tr><td style={{ color: "#7d8490" }}>Tipo</td>
                <td><span className="badge badge-info">{d.vehicle_type}</span></td></tr>
            )}
          </tbody>
        </table>
      )}

      {!isOk && result.reason && (
        <div style={{ fontSize: 13, color: "#7d8490", textAlign: "center", marginTop: 8 }}>
          {result.reason}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button className="btn btn-default btn-sm" onClick={onClear}>
          <i className="fa fa-refresh" style={{ marginRight: 6 }} />
          Nuevo escaneo
        </button>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function EscanerQR() {
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const detectorRef= useRef(null);
  const rafRef     = useRef(null);

  const [camActive,  setCamActive]  = useState(false);
  const [camError,   setCamError]   = useState("");
  const [scanning,   setScanning]   = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result,     setResult]     = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showVisitor,setShowVisitor]= useState(false);
  const [scanCount,  setScanCount]  = useState(0);

  // ── Enviar código al backend ──────────────────────────────────────────────
  const processCode = useCallback(async (code) => {
    if (processing || !code?.trim()) return;
    setProcessing(true);
    stopCamera();
    try {
      const res = await api.post("/qr/scan", { code: code.trim() });
      setResult({ success: true, data: res.data.data });
      setScanCount(c => c + 1);
    } catch (e) {
      const errData = e.response?.data;
      setResult({
        success: false,
        message: errData?.message || "Acceso denegado",
        reason:  errData?.reason  || "Error al procesar el código QR.",
      });
    } finally {
      setProcessing(false);
    }
  }, [processing]); // eslint-disable-line

  // ── Cámara ────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamActive(true);

      // BarcodeDetector API (Chrome 83+, Edge)
      if ("BarcodeDetector" in window) {
        detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
        setScanning(true);
        const detect = async () => {
          if (!videoRef.current || !detectorRef.current) return;
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current);
            if (barcodes.length > 0) {
              processCode(barcodes[0].rawValue);
              return;
            }
          } catch (_) {}
          rafRef.current = requestAnimationFrame(detect);
        };
        rafRef.current = requestAnimationFrame(detect);
      } else {
        setCamError("Tu navegador no soporta detección QR automática. Usa el input manual.");
      }
    } catch (e) {
      setCamError(
        e.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Usa el input manual."
          : "No se pudo acceder a la cámara. Usa el input manual."
      );
    }
  };

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current  = null;
    detectorRef.current= null;
    setCamActive(false);
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleClear = () => {
    setResult(null);
    setManualCode("");
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      <div className="row clearfix">
        {/* ── Panel izquierdo — escáner ──────────────────────────────────── */}
        <div className="col-lg-7 col-md-12">
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="card-title">
                <i className="fa fa-qrcode" style={{ marginRight: 6 }} />
                Escáner QR
              </h3>
              <button
                className="btn btn-outline btn-sm"
                style={{ borderColor: "#800020", color: "#800020" }}
                onClick={() => setShowVisitor(true)}>
                <i className="fa fa-user-plus" style={{ marginRight: 6 }} />
                Generar QR visitante
              </button>
            </div>

            <div className="card-body" style={{ padding: "1.25rem" }}>
              {/* Área de cámara */}
              <div style={{
                position: "relative", width: "100%", aspectRatio: "4/3", maxHeight: 340,
                background: "#111", borderRadius: 8, overflow: "hidden", marginBottom: 16,
                border: "2px solid rgba(128,0,32,0.3)",
              }}>
                <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  playsInline muted />

                {/* Overlay cuando no hay cámara */}
                {!camActive && (
                  <div style={{
                    position: "absolute", inset: 0, display: "flex",
                    flexDirection: "column", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.85)",
                  }}>
                    <i className="fa fa-camera" style={{ fontSize: 48, color: "rgba(255,255,255,0.2)", marginBottom: 12 }} />
                    <p style={{ color: "#7d8490", fontSize: 13, marginBottom: 16, textAlign: "center", padding: "0 1rem" }}>
                      Activa la cámara para escanear QR automáticamente
                    </p>
                    <button className="btn btn-primary btn-sm" onClick={startCamera}>
                      <i className="fa fa-camera" style={{ marginRight: 6 }} />
                      Activar cámara
                    </button>
                  </div>
                )}

                {/* Overlay de escaneo activo */}
                {camActive && scanning && !processing && (
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    {/* Marco de enfoque */}
                    <div style={{
                      position: "absolute", top: "50%", left: "50%",
                      transform: "translate(-50%,-50%)",
                      width: 180, height: 180,
                      border: "2px solid #800020",
                      borderRadius: 8,
                    }}>
                      {/* Esquinas */}
                      {[["top:0;left:0", "top", "left"],["top:0;right:0", "top", "right"],
                        ["bottom:0;left:0", "bottom", "left"],["bottom:0;right:0", "bottom", "right"]
                      ].map(([pos], i) => (
                        <div key={i} style={{
                          position: "absolute", width: 16, height: 16,
                          borderColor: "#800020", borderStyle: "solid",
                          borderWidth: i === 0 ? "3px 0 0 3px" : i === 1 ? "3px 3px 0 0" : i === 2 ? "0 0 3px 3px" : "0 3px 3px 0",
                          ...(i === 0 ? { top: -2, left: -2 } : i === 1 ? { top: -2, right: -2 } : i === 2 ? { bottom: -2, left: -2 } : { bottom: -2, right: -2 }),
                        }} />
                      ))}
                      {/* Línea de escaneo */}
                      <div style={{
                        position: "absolute", left: 4, right: 4, height: 2,
                        background: "#800020", top: "50%",
                        animation: "pulse 1.2s ease-in-out infinite",
                      }} />
                    </div>
                    <div style={{
                      position: "absolute", bottom: 12, left: 0, right: 0,
                      textAlign: "center", color: "#fff", fontSize: 12,
                    }}>
                      Apunta al código QR
                    </div>
                  </div>
                )}

                {/* Procesando */}
                {processing && (
                  <div style={{
                    position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  }}>
                    <i className="fa fa-spinner fa-spin fa-2x" style={{ color: "#800020", marginBottom: 10 }} />
                    <span style={{ color: "#fff", fontSize: 13 }}>Verificando...</span>
                  </div>
                )}
              </div>

              {/* Error de cámara */}
              {camError && (
                <div className="alert" style={{
                  background: "rgba(251,189,8,0.12)", border: "1px solid #fbbd08",
                  borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#fbbd08", marginBottom: 12,
                }}>
                  <i className="fa fa-exclamation-triangle" style={{ marginRight: 6 }} />
                  {camError}
                </div>
              )}

              {/* Botones cámara */}
              {camActive && (
                <div style={{ marginBottom: 16, textAlign: "center" }}>
                  <button className="btn btn-default btn-sm" onClick={stopCamera}>
                    <i className="fa fa-stop" style={{ marginRight: 6 }} />
                    Detener cámara
                  </button>
                </div>
              )}

              {/* Input manual */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: "block" }}>
                  <i className="fa fa-keyboard-o" style={{ marginRight: 6, color: "#7d8490" }} />
                  Ingreso manual de código
                </label>
                <div className="input-group">
                  <input
                    className="form-control"
                    placeholder="Pega o escribe el código QR aquí..."
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && processCode(manualCode)}
                    disabled={processing}
                  />
                  <div className="input-group-append">
                    <button
                      className="btn btn-primary"
                      onClick={() => processCode(manualCode)}
                      disabled={processing || !manualCode.trim()}>
                      {processing
                        ? <i className="fa fa-spinner fa-spin" />
                        : <i className="fa fa-check" />}
                    </button>
                  </div>
                </div>
                <small style={{ color: "#7d8490", fontSize: 11, marginTop: 4, display: "block" }}>
                  También puedes usar un lector USB: enfoca este campo y escanea.
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* ── Panel derecho — resultado + stats ─────────────────────────── */}
        <div className="col-lg-5 col-md-12">
          {/* Resultado */}
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div className="card-header">
              <h3 className="card-title">
                <i className="fa fa-info-circle" style={{ marginRight: 6 }} />
                Resultado
              </h3>
            </div>
            <div className="card-body" style={{ padding: "1.25rem" }}>
              {!result && !processing ? (
                <div style={{ textAlign: "center", padding: "2rem 0", color: "#7d8490" }}>
                  <i className="fa fa-qrcode fa-3x" style={{ display: "block", marginBottom: 12, color: "#343a40" }} />
                  <span style={{ fontSize: 13 }}>Esperando escaneo…</span>
                </div>
              ) : processing ? (
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                  <i className="fa fa-spinner fa-spin fa-2x" style={{ color: "#800020", display: "block", marginBottom: 12 }} />
                  <span style={{ color: "#7d8490", fontSize: 13 }}>Verificando acceso...</span>
                </div>
              ) : (
                <ResultPanel result={result} onClear={handleClear} />
              )}
            </div>
          </div>

          {/* Stats de la sesión */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: 14 }}>
                <i className="fa fa-bar-chart" style={{ marginRight: 6 }} />
                Estadísticas del turno
              </h3>
            </div>
            <div className="card-body" style={{ padding: "1rem" }}>
              {[
                { label: "Escaneos procesados", value: scanCount, color: "#800020", icon: "fa-qrcode" },
                { label: "Cámara",              value: camActive ? "Activa" : "Inactiva", color: camActive ? "#21ba45" : "#7d8490", icon: "fa-camera" },
                { label: "Detección",           value: scanning ? "Automática" : "Manual", color: scanning ? "#17a2b8" : "#fbbd08", icon: "fa-search" },
              ].map(({ label, value, color, icon }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <span style={{ fontSize: 13, color: "#7d8490" }}>
                    <i className={`fa ${icon}`} style={{ marginRight: 8, color }} />
                    {label}
                  </span>
                  <strong style={{ color }}>{value}</strong>
                </div>
              ))}

              <div style={{ marginTop: 16 }}>
                <div style={{
                  background: "rgba(128,0,32,0.08)", borderRadius: 6,
                  padding: "10px 12px", fontSize: 12, color: "#7d8490",
                }}>
                  <i className="fa fa-info-circle" style={{ marginRight: 6, color: "#17a2b8" }} />
                  Soporta QR de la app, tarjetas RFID virtuales y QR de visitante generados en este panel.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showVisitor && <VisitorModal onClose={() => setShowVisitor(false)} />}
    </>
  );
}
