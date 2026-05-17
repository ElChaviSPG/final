export const metadata = { title: "Kiosco — Parqueo USPG" };

export default function KioscoLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
        />
      </head>
      <body style={{ margin: 0, background: "#0f1419", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
