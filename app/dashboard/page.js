"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profilo, setProfilo] = useState(null);

  const [stats, setStats] = useState({
    fatturato: 0,
    stipendio: 0,
    numero_fatture: 0,
  });

  useEffect(() => {
    caricaDashboard();
  }, []);

  async function caricaDashboard() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // ==============================
      // PROFILO
      // ==============================

      const {
        data: profiloData,
        error: profiloError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          nome,
          cognome,
          ruolo,
          grado,
          percentuale_stipendio,
          attivo
        `)
        .eq("id", user.id)
        .single();

      if (profiloError || !profiloData) {
        throw (
          profiloError ||
          new Error("Profilo non trovato")
        );
      }

      if (!profiloData.attivo) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setProfilo(profiloData);

      // ==============================
      // STATISTICHE
      // ==============================

      const {
        data: statsData,
        error: statsError,
      } = await supabase
        .from("employee_stats")
        .select(`
          numero_fatture,
          fatturato,
          stipendio
        `)
        .eq("id", user.id)
        .maybeSingle();

      if (statsError) {
        throw statsError;
      }

      if (statsData) {
        setStats({
          numero_fatture: Number(
            statsData.numero_fatture || 0
          ),
          fatturato: Number(
            statsData.fatturato || 0
          ),
          stipendio: Number(
            statsData.stipendio || 0
          ),
        });
      }
    } catch (error) {
      console.error(
        "Errore caricamento dashboard:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  function formattaSoldi(numero) {
    return `$${new Intl.NumberFormat("it-IT", {
      maximumFractionDigits: 2,
    }).format(Number(numero || 0))}`;
  }

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <>
        <Sidebar />

        <main
          style={{
            minHeight: "100vh",
            marginLeft: "250px",
            padding: "30px",
          }}
        >
          <div
            className="container"
            style={{
              maxWidth: "1100px",
            }}
          >
            <h2
              style={{
                color: "#ffffff",
                fontSize: "24px",
              }}
            >
              Dashboard
            </h2>

            <p
              style={{
                color: "#888",
                marginTop: "10px",
              }}
            >
              Caricamento...
            </p>
          </div>
        </main>
      </>
    );
  }

  if (!profilo) {
    return null;
  }

  const admin =
    profilo.ruolo === "admin";

  const nomeCompleto =
    `${profilo.nome || ""} ${
      profilo.cognome || ""
    }`.trim();

  return (
    <>
      <Sidebar />

      <main
        style={{
          minHeight: "100vh",
          marginLeft: "250px",
          padding: "30px",
        }}
      >
        <div
          className="container"
          style={{
            maxWidth: "1100px",
          }}
        >
          {/* ======================== */}
          {/* HEADER */}
          {/* ======================== */}

          <div
            style={{
              marginBottom: "30px",
            }}
          >
            <h1
              style={{
                color: "#ffffff",
                fontSize: "30px",
                fontWeight: "800",
                margin: 0,
              }}
            >
              Dashboard
            </h1>

            <p
              style={{
                color: "#888888",
                marginTop: "7px",
                fontSize: "14px",
              }}
            >
              Benvenuto nel gestionale
              Armeria 200
            </p>
          </div>

          {/* ======================== */}
          {/* PROFILO */}
          {/* ======================== */}

          <div
            className="card"
            style={{
              marginBottom: "25px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "25px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#888888",
                    fontSize: "12px",
                    fontWeight: "700",
                    textTransform:
                      "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "7px",
                  }}
                >
                  Utente
                </div>

                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "24px",
                    fontWeight: "800",
                  }}
                >
                  {nomeCompleto ||
                    profilo.username}
                </div>

                <div
                  style={{
                    color: "#777777",
                    fontSize: "12px",
                    marginTop: "5px",
                  }}
                >
                  @{profilo.username}
                </div>
              </div>

              <div
                style={{
                  textAlign: "right",
                }}
              >
                {admin && (
                  <div
                    style={{
                      display:
                        "inline-block",
                      marginBottom: "8px",
                      padding: "4px 8px",
                      background:
                        "rgba(125,22,22,0.15)",
                      border:
                        "1px solid rgba(139,30,30,0.3)",
                      borderRadius: "5px",
                      color: "#c85b5b",
                      fontSize: "9px",
                      fontWeight: "800",
                      letterSpacing: "1px",
                    }}
                  >
                    ADMIN
                  </div>
                )}

                <div
                  style={{
                    color: "#ffffff",
                    fontSize: "17px",
                    fontWeight: "800",
                  }}
                >
                  {profilo.grado ||
                    "Dipendente"}
                </div>

                <div
                  style={{
                    color: "#888888",
                    fontSize: "12px",
                    marginTop: "5px",
                  }}
                >
                  Percentuale stipendio{" "}
                  <span
                    style={{
                      color: "#b94a4a",
                      fontWeight: "800",
                    }}
                  >
                    {
                      profilo.percentuale_stipendio
                    }
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ======================== */}
          {/* STATISTICHE */}
          {/* ======================== */}

          <h2
            style={{
              color: "#ffffff",
              fontSize: "19px",
              fontWeight: "800",
              marginBottom: "15px",
            }}
          >
            Le tue statistiche
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "15px",
              marginBottom: "30px",
            }}
          >
            <StatCard
              titolo="Fatturato personale"
              valore={formattaSoldi(
                stats.fatturato
              )}
              descrizione="Totale delle tue fatture valide"
            />

            <StatCard
              titolo="Stipendio maturato"
              valore={formattaSoldi(
                stats.stipendio
              )}
              descrizione={`Calcolato al ${profilo.percentuale_stipendio}%`}
            />

            <StatCard
              titolo="Fatture effettuate"
              valore={
                stats.numero_fatture
              }
              descrizione="Numero di fatture valide"
            />
          </div>

          {/* ======================== */}
          {/* INFO */}
          {/* ======================== */}

          <div className="card">
            <div
              style={{
                color: "#ffffff",
                fontSize: "17px",
                fontWeight: "800",
                marginBottom: "9px",
              }}
            >
              Armeria 200
            </div>

            <p
              style={{
                color: "#888888",
                fontSize: "13px",
                lineHeight: "1.7",
                margin: 0,
                maxWidth: "760px",
              }}
            >
              Utilizza il menu a
              sinistra per registrare
              fatture, effettuare ordini
              di import, consultare gli
              storici e controllare il
              tuo stipendio.
              {admin &&
                " Le funzioni di amministrazione sono disponibili nella sezione dedicata."}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

// ==============================
// STAT CARD
// ==============================

function StatCard({
  titolo,
  valore,
  descrizione,
}) {
  return (
    <div
      className="card"
      style={{
        minHeight: "135px",
        padding: "22px",
      }}
    >
      <div
        style={{
          color: "#888888",
          fontSize: "11px",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "10px",
        }}
      >
        {titolo}
      </div>

      <div
        style={{
          color: "#ffffff",
          fontSize: "27px",
          fontWeight: "800",
          marginBottom: "9px",
        }}
      >
        {valore}
      </div>

      <div
        style={{
          color: "#666666",
          fontSize: "11px",
        }}
      >
        {descrizione}
      </div>
    </div>
  );
}
