export const metadata = {
  title: 'Sitio en mantenimiento',
  description: 'Estamos realizando mejoras. Volvemos pronto.',
}

export default function MaintenancePage() {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          body {
            background-color: #080c14;
            color: #e2e8f0;
            font-family: 'DM Sans', sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .bg {
            position: fixed;
            inset: 0;
            z-index: 0;
            background:
              radial-gradient(ellipse 80% 60% at 20% 90%, rgba(99, 102, 241, 0.12) 0%, transparent 60%),
              radial-gradient(ellipse 60% 50% at 80% 10%, rgba(6, 182, 212, 0.08) 0%, transparent 55%),
              radial-gradient(ellipse 40% 40% at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%);
          }

          .grid-lines {
            position: fixed;
            inset: 0;
            z-index: 0;
            background-image:
              linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
            background-size: 60px 60px;
            mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
          }

          .container {
            position: relative;
            z-index: 1;
            text-align: center;
            padding: 2rem;
            max-width: 560px;
            width: 100%;
            animation: fadeUp 0.8s ease both;
          }

          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          .icon-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin-bottom: 2rem;
            animation: fadeUp 0.8s ease 0.1s both;
          }

          .gear {
            display: inline-block;
            font-size: 36px;
            line-height: 1;
            animation: spin 10s linear infinite;
          }
          .gear-sm {
            display: inline-block;
            font-size: 22px;
            line-height: 1;
            animation: spin 6s linear infinite reverse;
            margin-top: 10px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(99, 102, 241, 0.15);
            border: 1px solid rgba(99, 102, 241, 0.35);
            border-radius: 999px;
            padding: 5px 16px;
            font-size: 11px;
            font-weight: 500;
            color: #a5b4fc;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin-bottom: 1.5rem;
            font-family: 'DM Mono', monospace;
            animation: fadeUp 0.8s ease 0.15s both;
          }

          .badge-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #818cf8;
            animation: blink 2s ease-in-out infinite;
          }

          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.2; }
          }

          h1 {
            font-size: clamp(28px, 5vw, 40px);
            font-weight: 300;
            line-height: 1.2;
            color: #f1f5f9;
            margin-bottom: 1rem;
            letter-spacing: -0.02em;
            animation: fadeUp 0.8s ease 0.2s both;
          }

          h1 strong {
            font-weight: 500;
            background: linear-gradient(135deg, #a5b4fc, #67e8f9);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .subtitle {
            font-size: 15px;
            color: #64748b;
            line-height: 1.7;
            margin-bottom: 2.5rem;
            animation: fadeUp 0.8s ease 0.25s both;
          }

          .divider {
            width: 40px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent);
            margin: 0 auto 2.5rem;
            animation: fadeUp 0.8s ease 0.3s both;
          }

          .status-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 13px;
            color: #475569;
            animation: fadeUp 0.8s ease 0.35s both;
          }

          .dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #334155;
            animation: pulse 1.4s ease-in-out infinite;
          }
          .dot:nth-child(2) { animation-delay: 0.2s; }
          .dot:nth-child(3) { animation-delay: 0.4s; }

          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50%       { opacity: 1;   transform: scale(1.3); }
          }

          .contact {
            margin-top: 3rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(255,255,255,0.05);
            font-size: 13px;
            color: #334155;
            animation: fadeUp 0.8s ease 0.4s both;
          }

          .contact a {
            color: #6366f1;
            text-decoration: none;
          }

          .contact a:hover {
            color: #a5b4fc;
          }

          @media (max-width: 480px) {
            .container { padding: 1.5rem; }
          }
        `}</style>
      </head>
      <body>
        <div className="bg" />
        <div className="grid-lines" />

        <div className="container">
          <div className="icon-wrap">
            <span className="gear">⚙️</span>
            <span className="gear-sm">⚙️</span>
          </div>

          <div className="badge">
            <span className="badge-dot" />
            Mantenimiento programado
          </div>

          <h1>
            Estamos mejorando<br />
            <strong>las cosas para ti</strong>
          </h1>

          <p className="subtitle">
            El sitio se encuentra temporalmente fuera de servicio<br />
            mientras realizamos mejoras. Estaremos de vuelta pronto.
          </p>

          <div className="divider" />

          <div className="status-row">
            <span>Trabajando en ello</span>
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>

          <div className="contact">
            ¿Tienes dudas? Escríbenos a{' '}
            <a href="mailto:lespinoza@bioflex.mx">lespinoza@bioflex.mx</a>
          </div>
        </div>
      </body>
    </html>
  )
}