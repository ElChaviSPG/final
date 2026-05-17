"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const ROLE_LABELS = {
  ADMIN: "Administrador", TEACHER: "Docente",
  STUDENT: "Estudiante", VISITOR: "Visitante", SECURITY: "Seguridad",
};

const ROLE_COLORS = {
  ADMIN: "#a333c8", TEACHER: "#2185d0",
  STUDENT: "#21ba45", VISITOR: "#f2711c", SECURITY: "#fbbd08",
};

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// Pantalla de resultado tras escanear
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

  const color = isError ? "#db2828" : isEntry ? "#21ba45" : "#2185d0";
  const icon = isError ? "fa-times-circle" : isEntry ? "fa-sign-in-alt" : "fa-sign-out-alt";
  const label = isError ? "Acceso denegado" : isEntry ? "Acceso permitido — ENTRADA" : "Acceso permitido — SALIDA";

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 32,
      background: isError
        ? "linear-gradient(160deg, #1a0505 60%, #0f0000 100%)"
        : isEntry
          ? "linear-gradient(160deg, #051a09 60%, #0a1f0e 100%)"
          : "linear-gradient(160deg, #05101a 60%, #0a1522 100%)",
    }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <i className={`fas ${icon}`} style={{ fontSize: 80, color, marginBottom: 20, display: "block" }} />
        <div style={{ color, fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{label}</div>
      </div>

      {!isError && (
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Placa destacada */}
          <div style={{
            background: "rgba(255,255,255,0.05)", border: `2px solid ${color}`,
            borderRadius: 16, padding: 24, textAlign: "center", marginBottom: 16,
          }}>
            <div style={{ color: "#aaa", fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
              Vehículo
            </div>
            <div style={{ color: "#fff", fontSize: 34, fontWeight: 900, letterSpacing: 6, marginBottom: 8 }}>
              {result.placa}
            </div>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>
              {result.owner_name}
            </div>
            {result.role && (
              <div style={{
                display: "inline-block", marginTop: 8,
                background: `${ROLE_COLORS[result.role] ?? "#aaa"}22`,
                border: `1px solid ${ROLE_COLORS[result.role] ?? "#aaa"}`,
                color: ROLE_COLORS[result.role] ?? "#aaa",
                borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700,
              }}>
                {ROLE_LABELS[result.role] ?? result.role}
              </div>
            )}
          </div>

          {/* Detalles */}
          <div style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid #1e2a36",
            borderRadius: 12, padding: 16, marginBottom: 16,
          }}>
            {isEntry ? (
              <>
                <Row icon="fa-map-marker-alt" label="Espacio asignado"
                  value={`${result.space_code} · Zona ${result.zone}`} valueColor="#fff" />
                {result.evento && (
                  <Row icon="fa-calendar" label="Evento" value={result.evento} />
                )}
                {result.suscripcion && (
                  <Row icon="fa-id-card" label="Suscripción" value="Activa — tarifa cubierta" valueColor="#21ba45" />
                )}
              </>
            ) : (
              <>
                <Row icon="fa-map-marker-alt" label="Espacio"
                  value={`${result.space_code} · Zona ${result.zone}`} />
                <Row icon="fa-clock" label="Tiempo total"
                  value={formatDuration(result.duration_minutes)} />
                <Row icon="fa-money-bill" label="Monto"
                  value={result.amount_due === 0 ? "Sin cargo" : `Q ${result.amount_due.toFixed(2)}`}
                  valueColor={result.amount_due === 0 ? "#21ba45" : "#fbbd08"} />
                {result.suscripcion && (
                  <Row icon="fa-id-card" label="Suscripción" value="Activa — sin cargo" valueColor="#21ba45" />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {isError && (
        <div style={{
          background: "rgba(219,40,40,0.1)", border: "1px solid rgba(219,40,40,0.3)",
          borderRadius: 16, padding: 24, maxWidth: 380, textAlign: "center", marginBottom: 24,
        }}>
          <div style={{ color: "#ff6b6b", fontSize: 16 }}>{result.message}</div>
        </div>
      )}

      {/* Barra de progreso / countdown */}
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{
          height: 6, borderRadius: 3, background: "#1e2a36",
          overflow: "hidden", marginBottom: 12,
        }}>
          <div style={{
            height: "100%", background: color,
            width: `${(countdown / 8) * 100}%`,
            transition: "width 1s linear",
          }} />
        </div>
        <div style={{ color: "#555", fontSize: 13, textAlign: "center" }}>
          Volviendo en {countdown}s...
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value, valueColor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e2a36" }}>
      <span style={{ color: "#666", fontSize: 13 }}>
        <i className={`fas ${icon}`} style={{ marginRight: 6, width: 14 }} />{label}
      </span>
      <span style={{ color: valueColor ?? "#ccc", fontSize: 13, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

// Pantalla principal de escaneo
export default function AccesoQR() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef();

  const procesar = async (raw) => {
    const code = raw.trim();
    if (!code) return;
    setLoading(true);
    try {
      const r = await fetch("/api/parqueo/qr/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await r.json();
      if (!r.ok) {
        setResult({ action: "ERROR", message: json.message ?? "QR inválido o expirado" });
      } else {
        setResult(json.data);
      }
    } catch {
      setResult({ action: "ERROR", message: "Error de conexión con el servidor" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  if (result) return <ResultScreen result={result} onReset={reset} />;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: "linear-gradient(160deg, #0f1419 60%, #1a0a0f 100%)",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 28px", display: "flex", alignItems: "center", gap: 16,
        borderBottom: "1px solid #1e2a36",
      }}>
        <button onClick={() => router.push("/kiosco")} style={{
          background: "none", border: "1px solid #2e3d4e", borderRadius: 8,
          color: "#aaa", padding: "8px 14px", cursor: "pointer", fontSize: 14,
        }}>
          <i className="fas fa-arrow-left" style={{ marginRight: 6 }} />Volver
        </button>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>Control de acceso QR</div>
          <div style={{ color: "#666", fontSize: 12 }}>Escanea tu código QR para entrar o salir</div>
        </div>
      </div>

      {/* Área de escaneo */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 32,
      }}>
        {/* Animación de escaner */}
        <div style={{
          width: 220, height: 220, position: "relative",
          border: "3px solid #800020", borderRadius: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 36, overflow: "hidden",
          background: "rgba(128,0,32,0.05)",
        }}>
          {/* Esquinas decorativas */}
          {[["0","0","right","bottom"],["0","auto","right","top"],["auto","0","left","bottom"],["auto","auto","left","top"]].map(([b,r,bl,tr], i) => (
            <div key={i} style={{
              position: "absolute",
              bottom: b !== "auto" ? 0 : undefined, right: r !== "auto" ? 0 : undefined,
              top: b === "auto" ? 0 : undefined, left: r === "auto" ? 0 : undefined,
              width: 28, height: 28,
              borderBottom: b !== "auto" ? "4px solid #800020" : undefined,
              borderRight: r !== "auto" ? "4px solid #800020" : undefined,
              borderTop: b === "auto" ? "4px solid #800020" : undefined,
              borderLeft: r === "auto" ? "4px solid #800020" : undefined,
            }} />
          ))}
          {loading
            ? <i className="fas fa-spinner fa-spin" style={{ fontSize: 40, color: "#800020" }} />
            : <i className="fas fa-qrcode" style={{ fontSize: 64, color: "rgba(128,0,32,0.4)" }} />}

          {/* Línea de escaneo animada */}
          {!loading && (
            <div style={{
              position: "absolute", left: 8, right: 8, height: 2,
              background: "linear-gradient(90deg, transparent, #800020, transparent)",
              animation: "scan 2s ease-in-out infinite",
            }} />
          )}
        </div>

        <style>{`
          @keyframes scan {
            0%   { top: 20px; }
            50%  { top: 190px; }
            100% { top: 20px; }
          }
        `}</style>

        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ color: "#aaa", fontSize: 14, textAlign: "center", marginBottom: 16 }}>
            Pega o escribe el código QR de tu reserva
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              ref={inputRef}
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && procesar(input)}
              placeholder='{"reservationId":"...", "spaceCode":"..."}'
              style={{
                flex: 1,
                background: "#1a2430", border: "2px solid #2e3d4e",
                borderRadius: 10, padding: "14px 16px",
                color: "#fff", fontSize: 12, outline: "none",
                fontFamily: "monospace",
              }}
            />
            <button
              onClick={() => procesar(input)}
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() ? "#800020" : "#2e3d4e",
                border: "none", borderRadius: 10, padding: "14px 20px",
                color: "#fff", cursor: input.trim() ? "pointer" : "not-allowed",
                fontSize: 16, flexShrink: 0,
              }}
            >
              <i className="fas fa-arrow-right" />
            </button>
          </div>

          <div style={{
            marginTop: 20, padding: "12px 16px",
            background: "rgba(255,255,255,0.03)", border: "1px solid #1e2a36",
            borderRadius: 8, color: "#555", fontSize: 12, textAlign: "center",
          }}>
            <i className="fas fa-info-circle" style={{ marginRight: 6 }} />
            Primera pasada = Entrada · Segunda pasada = Salida
          </div>
        </div>
      </div>
    </div>
  );
}
