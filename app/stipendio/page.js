"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function StipendioPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profilo, setProfilo] = useState(null);

  const [stats, setStats] = useState({
    fatturato: 0,
    stipendio: 0,
    numero_fatture: 0,
  });

  useEffect(() => {
    caricaDati();
  }, []);

  async function caricaDati() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profiloData, error: profiloError } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

      if (profiloError || !profiloData) {
        throw profiloError || new Error("Profilo non trovato");
      }

      setProfilo(profiloData);

      const { data: statsData, error: statsError } =
        await supabase
          .from("employee_stats")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

      if (statsError) {
        throw statsError;
      }

      if (statsData) {
        setStats({
          fatturato: Number(statsData.fatturato || 0),
          stipendio: Number(statsData.stipendio || 0),
          numero_fatture: Number(
            statsData.numero_fatture || 0
          ),
        });
      }
    } catch (error) {
      console.error("Errore stipendio:", error);
    } finally {
      setLoading(false);
    }
  }

  function formattaSoldi(numero) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(numero || 0));
  }

  if (loading) {
    return (
      <main className="page">
        <div>
          Caricamento stipendio...
        </div>
      </main>
    );
  }

  if (!profilo) {
    return null;
  }

  const percentuale =
    Number(profilo.percentuale_stipendio || 0);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "30px",
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: "900px",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "35px",
          }}
        >
          <div>
            <div
              style={{
                color: "#8b1e1e",
                fontSize: "12px",
                fontWeight: "bold",
                letterSpacing: "4px",
                marginBottom: "6px",
              }}
            >
              ARMERIA 200
            </div>

            <h1 className="title">
              STIPENDIO
            </h1>

            <p className="subtitle">
              Riepilogo del tuo fatturato e
              dello stipendio maturato.
            </p>
          </div>

          <button
            className="btn btn-dark"
            onClick={() =>
              router.push("/dashboard")
            }
          >
            ← Dashboard
          </button>
        </div>

        {/* DIPENDENTE */}

        <div
          className="card"
          style={{
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              color: "#777",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "8px",
            }}
          >
            Dipendente
          </div>

          <div
            style={{
              fontSize: "24px",
              fontWeight: "800",
            }}
          >
            {profilo.nome || profilo.username}{" "}
            {profilo.cognome || ""}
          </div>

          <div
            style={{
              color: "#8b1e1e",
              fontWeight: "bold",
              marginTop: "7px",
            }}
          >
            Percentuale stipendio:{" "}
            {percentuale}%
          </div>
        </div>

        {/* STATISTICHE */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
            marginBottom: "20px",
          }}
        >
          <StatCard
            titolo="Fatture effettuate"
            valore={stats.numero_fatture}
          />

          <StatCard
            titolo="Fatturato personale"
            valore={formattaSoldi(
              stats.fatturato
            )}
          />

          <StatCard
            titolo="Percentuale"
            valore={`${percentuale}%`}
          />
        </div>

        {/* STIPENDIO */}

        <div
          className="card"
          style={{
            border:
              "1px solid rgba(139,30,30,.45)",
            textAlign: "center",
            padding: "40px 25px",
          }}
        >
          <div
            style={{
              color: "#777",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "3px",
            }}
          >
            Stipendio maturato
          </div>

          <div
            style={{
              fontSize: "48px",
              fontWeight: "900",
              marginTop: "15px",
              color: "#fff",
            }}
          >
            {formattaSoldi(
              stats.stipendio
            )}
          </div>

          <div
            style={{
              color: "#777",
              fontSize: "13px",
              marginTop: "15px",
            }}
          >
            {formattaSoldi(
              stats.fatturato
            )}{" "}
            × {percentuale}% ={" "}
            <strong
              style={{
                color: "#c42a2a",
              }}
            >
              {formattaSoldi(
                stats.stipendio
              )}
            </strong>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  titolo,
  valore,
}) {
  return (
    <div className="card">
      <div
        style={{
          color: "#777",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "1.5px",
          marginBottom: "10px",
        }}
      >
        {titolo}
      </div>

      <div
        style={{
          fontSize: "27px",
          fontWeight: "800",
        }}
      >
        {valore}
      </div>
    </div>
  );
}
