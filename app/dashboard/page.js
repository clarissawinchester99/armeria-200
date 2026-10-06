"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profilo, setProfilo] = useState(null);
  const [statistiche, setStatistiche] = useState({
    fatturato: 0,
    stipendio: 0,
    numero_fatture: 0,
  });

  useEffect(() => {
    caricaDashboard();
  }, []);

  async function caricaDashboard() {
    try {
      // Recupera utente autenticato
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // Recupera profilo
      const { data: profiloData, error: profiloError } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

      if (profiloError || !profiloData) {
        console.error(profiloError);
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (!profiloData.attivo) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setProfilo(profiloData);

      // Recupera statistiche dipendente
      const { data: statsData, error: statsError } =
        await supabase
          .from("employee_stats")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

      if (statsError) {
        console.error(statsError);
      }

      if (statsData) {
        setStatistiche({
          fatturato: Number(statsData.fatturato || 0),
          stipendio: Number(statsData.stipendio || 0),
          numero_fatture: Number(
            statsData.numero_fatture || 0
          ),
        });
      }
    } catch (error) {
      console.error("Errore dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  function formattaSoldi(numero) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(numero || 0);
  }

  if (loading) {
    return (
      <main className="page">
        <div
          style={{
            textAlign: "center",
          }}
        >
          <h2>ARMERIA 200</h2>

          <p
            style={{
              color: "#777",
              marginTop: "10px",
            }}
          >
            Caricamento gestionale...
          </p>
        </div>
      </main>
    );
  }

  if (!profilo) {
    return null;
  }

  const admin = profilo.ruolo === "admin";

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "30px",
      }}
    >
      <div className="container">

        {/* ========================= */}
        {/* HEADER */}
        {/* ========================= */}

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
              LOS SANTOS
            </div>

            <h1 className="title">
              ARMERIA 200
            </h1>

            <p className="subtitle">
              Benvenuto{" "}
              <strong
                style={{
                  color: "#fff",
                }}
              >
                {profilo.nome || profilo.username}
              </strong>

              {admin && (
                <span
                  style={{
                    marginLeft: "10px",
                    color: "#c42a2a",
                    fontWeight: "bold",
                  }}
                >
                  ADMIN
                </span>
              )}
            </p>
          </div>

          <button
            className="btn btn-dark"
            onClick={logout}
          >
            Esci
          </button>
        </div>

        {/* ========================= */}
        {/* STATISTICHE */}
        {/* ========================= */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
            marginBottom: "35px",
          }}
        >
          <StatCard
            titolo="Fatturato personale"
            valore={formattaSoldi(
              statistiche.fatturato
            )}
          />

          <StatCard
            titolo="Stipendio"
            valore={formattaSoldi(
              statistiche.stipendio
            )}
            sotto={
              profilo.percentuale_stipendio +
              "% del fatturato"
            }
          />

          <StatCard
            titolo="Fatture effettuate"
            valore={statistiche.numero_fatture}
          />

          <StatCard
            titolo="Ruolo"
            valore={
              admin
                ? "Amministratore"
                : "Dipendente"
            }
          />
        </div>

        {/* ========================= */}
        {/* MENU */}
        {/* ========================= */}

        <div
          style={{
            marginBottom: "15px",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            Gestionale
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "18px",
          }}
        >
          <MenuCard
            titolo="Nuova Fattura"
            descrizione="Crea una nuova fattura Armeria 200."
            bottone="Crea fattura"
            onClick={() =>
              router.push("/fatture")
            }
          />

          <MenuCard
            titolo="Storico Fatture"
            descrizione="Consulta le fatture effettuate."
            bottone="Visualizza storico"
            onClick={() =>
              router.push("/storico")
            }
          />

          <MenuCard
            titolo="Stipendio"
            descrizione="Controlla fatturato e stipendio maturato."
            bottone="Visualizza"
            onClick={() =>
              router.push("/stipendio")
            }
          />

          {admin && (
            <MenuCard
              titolo="Pannello Admin"
              descrizione="Gestisci dipendenti, fatture e statistiche dell'Armeria."
              bottone="Amministrazione"
              onClick={() =>
                router.push("/admin")
              }
              admin
            />
          )}
        </div>

        {/* ========================= */}
        {/* FOOTER */}
        {/* ========================= */}

        <div
          style={{
            marginTop: "50px",
            paddingTop: "20px",
            borderTop: "1px solid #222",
            textAlign: "center",
            color: "#555",
            fontSize: "11px",
            letterSpacing: "2px",
          }}
        >
          ARMERIA 200 • GESTIONALE INTERNO
        </div>
      </div>
    </main>
  );
}

/* ============================= */
/* CARD STATISTICHE */
/* ============================= */

function StatCard({
  titolo,
  valore,
  sotto,
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
          color: "#fff",
        }}
      >
        {valore}
      </div>

      {sotto && (
        <div
          style={{
            color: "#8b1e1e",
            fontSize: "12px",
            marginTop: "7px",
            fontWeight: "bold",
          }}
        >
          {sotto}
        </div>
      )}
    </div>
  );
}

/* ============================= */
/* CARD MENU */
/* ============================= */

function MenuCard({
  titolo,
  descrizione,
  bottone,
  onClick,
  admin = false,
}) {
  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "210px",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "3px",
          background: admin
            ? "#c42a2a"
            : "#7d1616",
          marginBottom: "20px",
        }}
      />

      <h3
        style={{
          fontSize: "20px",
          marginBottom: "10px",
        }}
      >
        {titolo}
      </h3>

      <p
        style={{
          color: "#777",
          fontSize: "13px",
          lineHeight: "1.6",
          marginBottom: "25px",
        }}
      >
        {descrizione}
      </p>

      <button
        className={
          admin
            ? "btn btn-primary"
            : "btn btn-dark"
        }
        onClick={onClick}
        style={{
          width: "100%",
          marginTop: "auto",
        }}
      >
        {bottone}
      </button>
    </div>
  );
}
