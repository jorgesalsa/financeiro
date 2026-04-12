"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem", color: "#dc2626" }}>
            Erro Inesperado
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "2rem", maxWidth: "32rem" }}>
            Ocorreu um erro inesperado no sistema. Nossa equipe foi notificada
            automaticamente. Tente novamente ou entre em contato com o suporte.
          </p>
          {error.digest && (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem", marginBottom: "1rem" }}>
              Referencia: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "0.75rem 2rem",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Tentar Novamente
          </button>
        </div>
      </body>
    </html>
  );
}
