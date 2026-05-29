"use client";
import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import QRCode from "qrcode";

function decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export default function MiQrPage() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [copied, setCopied]   = useState(false);
  const canvasRef             = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setError("Sesión no iniciada"); setLoading(false); return; }
    const decoded = decodeJwt(token);
    if (!decoded?.sub) { setError("Token inválido"); setLoading(false); return; }
    api.get(`/users/${decoded.sub}`)
      .then(r => setUser(r.data.data))
      .catch(() => setError("No se pudo cargar el usuario"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user?.qr_code || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, user.qr_code, {
      width: 260,
      margin: 2,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    });
  }, [user]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qr-parqueo-${user?.carnet || user?.id}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleCopy = () => {
    if (!user?.qr_code) return;
    navigator.clipboard.writeText(user.qr_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return (
    <div className="text-center" style={{ padding: "60px 0", color: "#7d8490" }}>
      <i className="fa fa-spinner fa-spin fa-2x" />
      <p style={{ marginTop: 12 }}>Cargando QR…</p>
    </div>
  );

  if (error) return (
    <div className="alert alert-danger" style={{ maxWidth: 400, margin: "40px auto" }}>
      <i className="fa fa-exclamation-circle" style={{ marginRight: 8 }} />{error}
    </div>
  );

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
  const roleLabel = { ADMIN: "Administrador", STUDENT: "Estudiante", TEACHER: "Docente", SECURITY: "Seguridad", VISITOR: "Visitante" }[user.role] || user.role;

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-6 col-lg-4">
        <div className="card" style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg, #800020 0%, #a00028 100%)", padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <i className="fa fa-user" style={{ color: "#fff", fontSize: 20 }} />
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{fullName}</div>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
                  {roleLabel}{user.carnet ? ` · ${user.carnet}` : ""}
                </div>
              </div>
            </div>
          </div>

          {/* QR Canvas */}
          <div className="card-body" style={{ textAlign: "center", padding: "28px 24px 16px" }}>
            <div style={{
              display: "inline-block", padding: 12, background: "#fff",
              borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
            }}>
              <canvas ref={canvasRef} />
            </div>

            <p style={{ marginTop: 16, marginBottom: 4, color: "#7d8490", fontSize: 11 }}>
              Código de acceso
            </p>
            <code style={{
              display: "block", fontSize: 10, color: "#adb5bd",
              wordBreak: "break-all", padding: "4px 8px",
              background: "rgba(255,255,255,0.04)", borderRadius: 4,
            }}>
              {user.qr_code}
            </code>
          </div>

          {/* Acciones */}
          <div style={{ padding: "8px 24px 24px", display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, fontSize: 13, background: "#800020", borderColor: "#800020" }}
              onClick={handleDownload}
            >
              <i className="fa fa-download" style={{ marginRight: 6 }} />Descargar PNG
            </button>
            <button
              className="btn btn-outline-secondary"
              style={{ flex: 1, fontSize: 13 }}
              onClick={handleCopy}
            >
              <i className={`fa ${copied ? "fa-check" : "fa-copy"}`} style={{ marginRight: 6 }} />
              {copied ? "Copiado" : "Copiar código"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "#7d8490", fontSize: 12, marginTop: 12 }}>
          <i className="fa fa-info-circle" style={{ marginRight: 6 }} />
          Presenta este QR en el kiosco para registrar tu entrada o salida.
        </p>
      </div>
    </div>
  );
}
