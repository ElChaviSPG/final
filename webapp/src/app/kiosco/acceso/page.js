"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const ROLE_LABELS  = { ADMIN:"Administrador", TEACHER:"Docente", STUDENT:"Estudiante", VISITOR:"Visitante", SECURITY:"Seguridad" };
const ROLE_COLORS  = { ADMIN:"#a333c8", TEACHER:"#2185d0", STUDENT:"#21ba45", VISITOR:"#f2711c", SECURITY:"#fbbd08" };

function formatDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function Row({ icon, label, value, valueColor }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #1e2a36" }}>
      <span style={{ color:"#666", fontSize:14 }}>
        <i className={`fas ${icon}`} style={{ marginRight:8, width:16 }} />{label}
      </span>
      <span style={{ color: valueColor ?? "#ccc", fontSize:14, fontWeight:700 }}>{value}</span>
    </div>
  );
}

// ── Pantalla de resultado ─────────────────────────────────────────────────────
function ResultScreen({ result, onReset }) {
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(t); onReset(); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [onReset]);

  const isEntry = result.action === "ENTRY";
  const isError = result.action === "ERROR";
  const color   = isError ? "#db2828" : isEntry ? "#21ba45" : "#2185d0";
  const icon    = isError ? "fa-times-circle" : isEntry ? "fa-sign-in-alt" : "fa-sign-out-alt";
  const label   = isError ? "Acceso denegado" : isEntry ? "ENTRADA permitida" : "SALIDA permitida";
  const bg      = isError
    ? "linear-gradient(160deg,#1a0505 60%,#0f0000 100%)"
    : isEntry
      ? "linear-gradient(160deg,#051a09 60%,#0a1f0e 100%)"
      : "linear-gradient(160deg,#05101a 60%,#0a1522 100%)";

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, background:bg }}>
      <i className={`fas ${icon}`} style={{ fontSize:90, color, marginBottom:20 }} />
      <div style={{ color, fontSize:26, fontWeight:800, marginBottom:28 }}>{label}</div>

      {!isError && (
        <div style={{ width:"100%", maxWidth:440 }}>
          <div style={{
            background:"rgba(255,255,255,0.05)", border:`2px solid ${color}`,
            borderRadius:16, padding:24, textAlign:"center", marginBottom:16,
          }}>
            <div style={{ color:"#aaa", fontSize:12, fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Vehículo</div>
            <div style={{ color:"#fff", fontSize:36, fontWeight:900, letterSpacing:6, marginBottom:6 }}>{result.placa}</div>
            <div style={{ color:"#fff", fontSize:17, fontWeight:700 }}>{result.owner_name}</div>
            {result.role && (
              <div style={{
                display:"inline-block", marginTop:8,
                background:`${ROLE_COLORS[result.role]??'#aaa'}22`,
                border:`1px solid ${ROLE_COLORS[result.role]??'#aaa'}`,
                color: ROLE_COLORS[result.role]??'#aaa',
                borderRadius:20, padding:"3px 14px", fontSize:12, fontWeight:700,
              }}>
                {ROLE_LABELS[result.role]??result.role}
              </div>
            )}
          </div>

          <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #1e2a36", borderRadius:12, padding:"4px 16px", marginBottom:16 }}>
            {isEntry ? (
              <>
                <Row icon="fa-map-marker-alt" label="Espacio asignado" value={`${result.space_code} · Zona ${result.zone}`} valueColor="#fff" />
                {result.evento   && <Row icon="fa-calendar"  label="Evento"        value={result.evento} />}
                {result.suscripcion && <Row icon="fa-id-card" label="Suscripción"  value="Activa — sin cargo" valueColor="#21ba45" />}
              </>
            ) : (
              <>
                <Row icon="fa-map-marker-alt" label="Espacio"      value={`${result.space_code} · Zona ${result.zone}`} />
                <Row icon="fa-clock"          label="Tiempo total" value={formatDuration(result.duration_minutes)} />
                <Row icon="fa-money-bill"     label="Monto"
                  value={result.amount_due===0 ? "Sin cargo" : `Q ${result.amount_due?.toFixed(2)}`}
                  valueColor={result.amount_due===0 ? "#21ba45" : "#fbbd08"} />
                {result.suscripcion && <Row icon="fa-id-card" label="Suscripción" value="Activa — sin cargo" valueColor="#21ba45" />}
              </>
            )}
          </div>
        </div>
      )}

      {isError && (
        <div style={{
          background:"rgba(219,40,40,0.1)", border:"1px solid rgba(219,40,40,0.3)",
          borderRadius:16, padding:24, maxWidth:380, textAlign:"center", marginBottom:24,
        }}>
          <div style={{ color:"#ff6b6b", fontSize:16 }}>{result.message}</div>
        </div>
      )}

      {/* Barra countdown */}
      <div style={{ width:"100%", maxWidth:440 }}>
        <div style={{ height:6, borderRadius:3, background:"#1e2a36", overflow:"hidden", marginBottom:10 }}>
          <div style={{ height:"100%", background:color, width:`${(countdown/8)*100}%`, transition:"width 1s linear" }} />
        </div>
        <div style={{ color:"#555", fontSize:13, textAlign:"center" }}>Volviendo en {countdown}s…</div>
      </div>
    </div>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function AccesoQR() {
  const router      = useRouter();
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const detectorRef = useRef(null);
  const rafRef      = useRef(null);
  const manualRef   = useRef(null);

  const [camActive,   setCamActive]   = useState(false);
  const [camError,    setCamError]    = useState("");
  const [processing,  setProcessing]  = useState(false);
  const [result,      setResult]      = useState(null);
  const [manualCode,  setManualCode]  = useState("");

  const stopCamera = useCallback(() => {
    if (rafRef.current)    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current   = null;
    detectorRef.current = null;
    setCamActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const processCode = useCallback(async (code) => {
    if (processing || !code?.trim()) return;
    setProcessing(true);
    stopCamera();
    try {
      const r = await fetch("/api/parqueo/qr/scan", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await r.json();
      if (!r.ok) setResult({ action:"ERROR", message: json.message ?? "QR inválido o expirado" });
      else       setResult(json.data);
    } catch {
      setResult({ action:"ERROR", message:"Error de conexión con el servidor" });
    } finally {
      setProcessing(false);
    }
  }, [processing, stopCamera]);

  const startCamera = async () => {
    setCamError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"environment", width:{ ideal:1280 }, height:{ ideal:720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamActive(true);

      if ("BarcodeDetector" in window) {
        detectorRef.current = new window.BarcodeDetector({ formats:["qr_code"] });
        const detect = async () => {
          if (!videoRef.current || !detectorRef.current) return;
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current);
            if (barcodes.length > 0) { processCode(barcodes[0].rawValue); return; }
          } catch (_) {}
          rafRef.current = requestAnimationFrame(detect);
        };
        rafRef.current = requestAnimationFrame(detect);
      } else {
        setCamError("Tu navegador no soporta detección automática. Usa el campo manual.");
      }
    } catch (e) {
      setCamError(
        e.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Usa el campo manual."
          : "No se pudo acceder a la cámara."
      );
    }
  };

  const reset = useCallback(() => {
    setResult(null);
    setManualCode("");
    setTimeout(() => startCamera(), 300);
  }, []); // eslint-disable-line

  if (result) return <ResultScreen result={result} onReset={reset} />;

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background:"linear-gradient(160deg,#0f1419 60%,#1a0a0f 100%)" }}>
      <style>{`@keyframes scanline { 0%{top:10%} 50%{top:85%} 100%{top:10%} }`}</style>

      {/* Header */}
      <div style={{ padding:"20px 28px", display:"flex", alignItems:"center", gap:16, borderBottom:"1px solid #1e2a36" }}>
        <button onClick={() => { stopCamera(); router.push("/kiosco"); }} style={{
          background:"none", border:"1px solid #2e3d4e", borderRadius:8,
          color:"#aaa", padding:"8px 14px", cursor:"pointer", fontSize:14,
        }}>
          <i className="fas fa-arrow-left" style={{ marginRight:6 }} />Volver
        </button>
        <div>
          <div style={{ color:"#fff", fontWeight:800, fontSize:18 }}>Control de acceso QR</div>
          <div style={{ color:"#666", fontSize:12 }}>Apunta la cámara al código QR de tu reserva</div>
        </div>
      </div>

      {/* Área cámara */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28 }}>
        {/* Visor */}
        <div style={{
          position:"relative", width:"100%", maxWidth:400, aspectRatio:"1/1",
          background:"#0a0f14", borderRadius:20, overflow:"hidden",
          border:"2px solid rgba(128,0,32,0.4)", marginBottom:24,
        }}>
          <video ref={videoRef} style={{ width:"100%", height:"100%", objectFit:"cover" }} playsInline muted />

          {/* Overlay sin cámara */}
          {!camActive && !processing && (
            <div style={{
              position:"absolute", inset:0, display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.88)",
            }}>
              <i className="fas fa-camera" style={{ fontSize:56, color:"rgba(255,255,255,0.15)", marginBottom:16 }} />
              <p style={{ color:"#666", fontSize:13, textAlign:"center", margin:"0 0 20px", padding:"0 24px" }}>
                Toca el botón para activar la cámara
              </p>
              <button onClick={startCamera} style={{
                background:"#800020", border:"none", borderRadius:12,
                padding:"14px 32px", color:"#fff", fontSize:16, fontWeight:700, cursor:"pointer",
              }}>
                <i className="fas fa-camera" style={{ marginRight:8 }} />Activar cámara
              </button>
            </div>
          )}

          {/* Procesando */}
          {processing && (
            <div style={{
              position:"absolute", inset:0, display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.88)",
            }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize:48, color:"#800020", marginBottom:16 }} />
              <div style={{ color:"#fff", fontSize:15 }}>Verificando acceso…</div>
            </div>
          )}

          {/* Línea de escaneo animada */}
          {camActive && !processing && (
            <>
              {/* Esquinas */}
              {[[0,0,"bottom","right"],[0,"auto","bottom","left"],["auto",0,"top","right"],["auto","auto","top","left"]].map(([b,r],i) => (
                <div key={i} style={{
                  position:"absolute", width:32, height:32,
                  bottom: b!=="auto"?0:undefined, right: r!=="auto"?0:undefined,
                  top: b==="auto"?0:undefined,    left: r==="auto"?0:undefined,
                  borderBottom: b!=="auto"?"3px solid #800020":undefined,
                  borderRight:  r!=="auto"?"3px solid #800020":undefined,
                  borderTop:    b==="auto"?"3px solid #800020":undefined,
                  borderLeft:   r==="auto"?"3px solid #800020":undefined,
                }} />
              ))}
              <div style={{
                position:"absolute", left:12, right:12, height:2,
                background:"linear-gradient(90deg,transparent,#800020,transparent)",
                animation:"scanline 2s ease-in-out infinite",
              }} />
            </>
          )}
        </div>

        {/* Error cámara */}
        {camError && (
          <div style={{
            background:"rgba(251,189,8,0.1)", border:"1px solid rgba(251,189,8,0.3)",
            borderRadius:8, padding:"10px 16px", color:"#fbbd08", fontSize:13,
            textAlign:"center", marginBottom:16, maxWidth:400, width:"100%",
          }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight:8 }} />{camError}
          </div>
        )}

        {/* Input manual */}
        <div style={{ width:"100%", maxWidth:400 }}>
          <div style={{ color:"#444", fontSize:12, textAlign:"center", marginBottom:8 }}>
            — o ingresa el código manualmente —
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input
              ref={manualRef}
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && processCode(manualCode)}
              placeholder="Pega el contenido del QR aquí"
              style={{
                flex:1, background:"#1a2430", border:"1px solid #2e3d4e",
                borderRadius:10, padding:"12px 14px",
                color:"#fff", fontSize:12, outline:"none", fontFamily:"monospace",
              }}
            />
            <button
              onClick={() => processCode(manualCode)}
              disabled={!manualCode.trim() || processing}
              style={{
                background: manualCode.trim() ? "#800020" : "#2e3d4e",
                border:"none", borderRadius:10, padding:"12px 18px",
                color:"#fff", cursor: manualCode.trim() ? "pointer" : "not-allowed",
              }}
            >
              <i className="fas fa-arrow-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
