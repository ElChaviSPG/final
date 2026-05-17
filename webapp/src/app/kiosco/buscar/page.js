"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const ZONE_COLORS = { A: "#21ba45", B: "#2185d0", C: "#f2711c", D: "#a333c8", E: "#fbbd08" };

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatTime(dt) {
  return new Date(dt).toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
}

const ROLE_LABELS = { ADMIN: "Administrador", TEACHER: "Docente", STUDENT: "Estudiante", VISITOR: "Visitante", SECURITY: "Seguridad" };

export default function BuscarVehiculo() {
  const router = useRouter();
  const [placa, setPlaca] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const formatPlaca = (raw) => {
    const clean = raw.toUpperCase().replace(/-/g, "").replace(/[^A-Z0-9]/g, "");
    let r = "";
    for (let i = 0; i < clean.length && i < 7; i++) {
      const c = clean[i];
      if (i === 0 && /[A-Z]/.test(c))               r += c;
      else if (i >= 1 && i <= 3 && /[0-9]/.test(c)) r += c;
      else if (i >= 4 && i <= 6 && /[A-Z]/.test(c)) r += c;
    }
    return r.length > 1 ? r[0] + "-" + r.slice(1) : r;
  };

  const buscar = async () => {
    const p = placa.replace(/-/g, "");
    if (p.length < 4) { setError("Ingresa una placa válida"); return; }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await fetch(`/api/parqueo/kiosco/buscar?placa=${encodeURIComponent(placa)}`);
      const json = await r.json();
      if (!r.ok) { setError(json.message || "Vehículo no encontrado"); return; }
      setResult(json.data);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setPlaca(""); setError(""); setTimeout(() => inputRef.current?.focus(), 100); };

  const zoneColor = result?.session?.zone ? (ZONE_COLORS[result.session.zone] ?? "#aaa") : "#aaa";

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
          <i className="fas fa-arrow-left" style={{ marginRight: 6 }} /> Volver
        </button>
        <div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>Buscar mi vehículo</div>
          <div style={{ color: "#666", fontSize: 12 }}>Consulta la ubicación de tu vehículo</div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 32,
      }}>
        {!result ? (
          <div style={{ width: "100%", maxWidth: 460 }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "rgba(128,0,32,0.15)", border: "2px solid rgba(128,0,32,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <i className="fas fa-car" style={{ fontSize: 34, color: "#800020" }} />
              </div>
              <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>
                Ingresa tu número de placa
              </div>
              <div style={{ color: "#666", fontSize: 13, marginTop: 6 }}>
                Formato: X-000XXX
              </div>
            </div>

            <input
              ref={inputRef}
              autoFocus
              value={placa}
              onChange={e => setPlaca(formatPlaca(e.target.value))}
              onKeyDown={e => e.key === "Enter" && buscar()}
              placeholder="P-123ABC"
              maxLength={8}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#1a2430", border: "2px solid #2e3d4e",
                borderRadius: 12, padding: "18px 20px",
                color: "#fff", fontSize: 28, fontWeight: 800,
                letterSpacing: 6, textAlign: "center", outline: "none",
                marginBottom: 16,
              }}
            />

            {error && (
              <div style={{
                background: "rgba(219,40,40,0.1)", border: "1px solid rgba(219,40,40,0.3)",
                borderRadius: 8, padding: "12px 16px", color: "#ff6b6b",
                fontSize: 14, textAlign: "center", marginBottom: 16,
              }}>
                <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />
                {error}
              </div>
            )}

            <button
              onClick={buscar}
              disabled={loading || placa.length < 4}
              style={{
                width: "100%", padding: "18px", borderRadius: 12, border: "none",
                background: placa.length >= 4 ? "#800020" : "#2e3d4e",
                color: "#fff", fontSize: 18, fontWeight: 700, cursor: placa.length >= 4 ? "pointer" : "not-allowed",
                transition: "background 0.2s",
              }}
            >
              {loading
                ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Buscando...</>
                : <><i className="fas fa-search" style={{ marginRight: 8 }} />Buscar</>}
            </button>
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: 460 }}>
            {result.found ? (
              <>
                {/* Resultado encontrado */}
                <div style={{
                  background: "rgba(33,186,69,0.1)", border: "1px solid rgba(33,186,69,0.3)",
                  borderRadius: 16, padding: 24, marginBottom: 20, textAlign: "center",
                }}>
                  <i className="fas fa-check-circle" style={{ fontSize: 40, color: "#21ba45", marginBottom: 12, display: "block" }} />
                  <div style={{ color: "#21ba45", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                    Vehículo encontrado
                  </div>
                  <div style={{ color: "#fff", fontSize: 30, fontWeight: 900, letterSpacing: 4 }}>
                    {result.placa}
                  </div>
                  {(result.vehicle?.brand || result.vehicle?.model) && (
                    <div style={{ color: "#aaa", fontSize: 13, marginTop: 4 }}>
                      {[result.vehicle.brand, result.vehicle.model, result.vehicle.color].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>

                {/* Ubicación */}
                <div style={{
                  background: "#1a2430", border: "1px solid #2e3d4e",
                  borderRadius: 16, padding: 24, marginBottom: 20,
                }}>
                  <div style={{ color: "#aaa", fontSize: 12, fontWeight: 700, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
                    Ubicación actual
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: 16,
                      background: `${zoneColor}22`, border: `3px solid ${zoneColor}`,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <div style={{ color: zoneColor, fontSize: 11, fontWeight: 700 }}>ZONA</div>
                      <div style={{ color: zoneColor, fontSize: 32, fontWeight: 900, lineHeight: 1 }}>
                        {result.session.zone}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#fff", fontSize: 26, fontWeight: 900 }}>
                        {result.session.space_code}
                      </div>
                      <div style={{ color: "#aaa", fontSize: 13, marginTop: 4 }}>
                        <i className="fas fa-clock" style={{ marginRight: 6, color: "#fbbd08" }} />
                        Tiempo: {formatDuration(result.session.duration_minutes)}
                      </div>
                      <div style={{ color: "#aaa", fontSize: 13, marginTop: 2 }}>
                        <i className="fas fa-sign-in-alt" style={{ marginRight: 6 }} />
                        Entrada: {formatTime(result.session.entry_time)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Propietario */}
                <div style={{
                  background: "#1a2430", border: "1px solid #2e3d4e",
                  borderRadius: 12, padding: "14px 20px", marginBottom: 20,
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <i className="fas fa-user-circle" style={{ fontSize: 24, color: "#7eb8f7" }} />
                  <div>
                    <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{result.owner}</div>
                    <div style={{ color: "#aaa", fontSize: 12 }}>{ROLE_LABELS[result.role] ?? result.role}</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                background: "rgba(251,189,8,0.1)", border: "1px solid rgba(251,189,8,0.3)",
                borderRadius: 16, padding: 32, textAlign: "center", marginBottom: 20,
              }}>
                <i className="fas fa-parking" style={{ fontSize: 48, color: "#fbbd08", marginBottom: 16, display: "block" }} />
                <div style={{ color: "#fbbd08", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  Vehículo no estacionado
                </div>
                <div style={{ color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: 4, marginBottom: 8 }}>
                  {result.placa}
                </div>
                <div style={{ color: "#aaa", fontSize: 13 }}>
                  {result.vehicle?.brand ? `${result.vehicle.brand} ${result.vehicle.model ?? ""}` : ""}
                  {" · "}El vehículo no tiene una sesión activa en este momento.
                </div>
              </div>
            )}

            <button
              onClick={reset}
              style={{
                width: "100%", padding: "16px", borderRadius: 12, border: "none",
                background: "#800020", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer",
              }}
            >
              <i className="fas fa-search" style={{ marginRight: 8 }} />Nueva búsqueda
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
