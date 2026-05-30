"use client";
import { useState, useEffect } from "react";
import axios from "axios";

export default function InscripcionPage() {
  const [carreras, setCarreras] = useState([]);
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", telefono: "", carreraId: "" });
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get("/api/sistema-academico/carreras")
      .then(res => setCarreras(res.data.data || []))
      .catch(() => setError("Error cargando carreras. Intenta de nuevo."));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await axios.post("/api/sistema-academico/solicitudes", form);
      setEnviado(true);
    } catch (err) {
      setError(err.response?.data?.error || "Error enviando solicitud. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card" style={{ maxWidth: "500px", width: "100%", padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "60px", marginBottom: "20px" }}>✅</div>
          <h2 style={{ color: "#6B2C3E", marginBottom: "10px" }}>¡Solicitud enviada!</h2>
          <p className="text-muted">Tu solicitud de inscripción fue recibida exitosamente. Te notificaremos al correo <strong>{form.email}</strong> cuando sea revisada.</p>
          <button className="btn btn-primary mt-3" onClick={() => { setEnviado(false); setForm({ nombre: "", apellido: "", email: "", telefono: "", carreraId: "" }); }}>
            Enviar otra solicitud
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ maxWidth: "550px", width: "100%" }}>
        <div className="card">
          <div className="card-header text-center" style={{ background: "#6B2C3E", color: "white", padding: "30px" }}>
            <h2 style={{ margin: 0, color: "white" }}>Universidad de San Pablo de Guatemala</h2>
            <p style={{ margin: "10px 0 0", opacity: 0.8 }}>Formulario de Inscripción</p>
          </div>
          <div className="card-body" style={{ padding: "30px" }}>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre <span className="text-danger">*</span></label>
                <input type="text" className="form-control" placeholder="Tu nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Apellido <span className="text-danger">*</span></label>
                <input type="text" className="form-control" placeholder="Tu apellido" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Correo electrónico <span className="text-danger">*</span></label>
                <input type="email" className="form-control" placeholder="tucorreo@gmail.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Teléfono <span className="text-danger">*</span></label>
                <input type="tel" className="form-control" placeholder="5555-5555" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Carrera de interés <span className="text-danger">*</span></label>
                <select className="form-control" value={form.carreraId} onChange={e => setForm({ ...form, carreraId: e.target.value })} required>
                  <option value="">Seleccionar carrera...</option>
                  {carreras.filter(c => c.activo).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.nivel})</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ background: "#6B2C3E", border: "none", padding: "12px" }}>
                {loading ? "Enviando..." : "Enviar Solicitud"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}