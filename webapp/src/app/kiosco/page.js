"use client";
import { useRouter } from "next/navigation";

export default function KioscoHome() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #0f1419 60%, #1a0a0f 100%)",
      padding: 32,
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{
          background: "#800020", display: "inline-block",
          padding: "14px 36px", borderRadius: 12, marginBottom: 16,
        }}>
          <span style={{ color: "#fff", fontSize: 26, fontWeight: 800, letterSpacing: 2 }}>
            PARQUEO USPG
          </span>
        </div>
        <div style={{ color: "#aaa", fontSize: 15 }}>Sistema de control de acceso</div>
      </div>

      {/* Botones */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", maxWidth: 420 }}>
        <button
          onClick={() => router.push("/kiosco/acceso")}
          style={{
            background: "#800020", border: "none", borderRadius: 16,
            padding: "28px 24px", cursor: "pointer", color: "#fff",
            display: "flex", alignItems: "center", gap: 20,
            boxShadow: "0 8px 32px rgba(128,0,32,0.4)",
            transition: "transform 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 12,
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <i className="fas fa-qrcode" style={{ fontSize: 30 }} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Escanear QR</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
              Ingreso y salida del campus con código QR
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/kiosco/buscar")}
          style={{
            background: "#1e2a36", border: "2px solid #2e3d4e", borderRadius: 16,
            padding: "28px 24px", cursor: "pointer", color: "#fff",
            display: "flex", alignItems: "center", gap: 20,
            transition: "transform 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 12,
            background: "rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <i className="fas fa-car" style={{ fontSize: 28, color: "#7eb8f7" }} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Buscar mi vehículo</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
              Consulta dónde está estacionado tu vehículo
            </div>
          </div>
        </button>
      </div>

      <div style={{ color: "#444", fontSize: 12, marginTop: 48 }}>
        Universidad San Pablo Guatemala
      </div>
    </div>
  );
}
