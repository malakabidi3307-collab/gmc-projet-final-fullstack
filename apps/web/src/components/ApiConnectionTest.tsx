
"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type HealthResponse = {
  status: string;
  message: string;
  timestamp: string;
};

export default function ApiConnectionTest() {
  const [message, setMessage] = useState("Vérification de la connexion...");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;

    apiGet<HealthResponse>("/api/health")
      .then((data) => {
        if (!active) return;

        setConnected(data.status === "ok");
        setMessage(data.message);
      })
      .catch((error: unknown) => {
        if (!active) return;

        setConnected(false);
        setMessage(
          error instanceof Error
            ? error.message
            : "Impossible de joindre le backend.",
        );
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      style={{
        margin: "24px auto",
        maxWidth: "600px",
        padding: "16px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
      }}
    >
      <h2>Connexion au backend IFAG</h2>
      <p>
        Statut :{" "}
        <strong>{connected ? "Connecté" : "En attente ou erreur"}</strong>
      </p>
      <p>{message}</p>
    </section>
  );
}
