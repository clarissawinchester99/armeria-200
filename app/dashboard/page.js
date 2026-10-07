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

      // ==============================
      // ACCOUNT DISATTIVATO
      // ==============================

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
                color: "#b18a4a",
                fontSize: "22px",
                letterSpacing: "1px",
              }}
            >
              ARMERIA 200
            </h2>

            <p
              style={{
                color: "#686868",
                marginTop: "10px",
                fontSize: "13px",
              }}
            >
              Caricamento dashboard...
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

  // ==============================
  // PAGINA
  // ==============================

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
              marginBottom: "28px",
              paddingBottom: "20px",

              borderBottom:
                "1px solid rgba(177,138,74,.14)",
            }}
          >
            <div
              style={{
                color: "#713737",

                fontSize: "10px",
                fontWeight: "800",

                letterSpacing: "3px",

                marginBottom: "7px",
              }}
            >
              ARMERIA 200
            </div>

            <h1
              style={{
                color: "#dedede",

                fontSize: "30px",
                fontWeight: "900",

                letterSpacing: "1px",

                margin: 0,
              }}
            >
              Dashboard
            </h1>

            <p
              style={{
                color: "#666",

                marginTop: "7px",

                fontSize: "12px",
              }}
            >
              Gestionale dipendenti
            </p>
          </div>

          {/* ======================== */}
          {/* PROFILO */}
          {/* ======================== */}

          <div
            className="card"
            style={{
              marginBottom: "30px",

              padding: "25px 27px",

              background:
                "linear-gradient(135deg, #111111, #0b0b0b)",

              border:
                "1px solid rgba(177,138,74,.13)",

              boxShadow:
                "0 12px 35px rgba(0,0,0,.28)",
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
              {/* UTENTE */}

              <div>
                <div
                  style={{
                    color: "#777",

                    fontSize: "9px",
                    fontWeight: "800",

                    textTransform:
                      "uppercase",

                    letterSpacing: "2px",

                    marginBottom: "7px",
                  }}
                >
                  Benvenuto
                </div>

                <div
                  style={{
                    color: "#e4e4e4",

                    fontSize: "24px",
                    fontWeight: "800",
                  }}
                >
                  {nomeCompleto ||
                    profilo.username}
                </div>

                <div
                  style={{
                    color: "#626262",

                    fontSize: "11px",

                    marginTop: "5px",
                  }}
                >
                  @{profilo.username}
                </div>
              </div>

              {/* RUOLO */}

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
                        "rgba(92,35,35,.15)",

                      border:
                        "1px solid rgba(113,55,55,.30)",

                      borderRadius: "4px",

                      color: "#a96666",

                      fontSize: "8px",
                      fontWeight: "800",

                      letterSpacing: "1px",
                    }}
                  >
                    ADMIN
                  </div>
                )}

                <div
                  style={{
                    color: "#b18a4a",

                    fontSize: "17px",
                    fontWeight: "800",
                  }}
                >
                  {profilo.grado ||
                    "Dipendente"}
                </div>

                <div
                  style={{
                    color: "#777",

                    fontSize: "11px",

                    marginTop: "5px",
                  }}
                >
                  Percentuale stipendio{" "}
                  <span
                    style={{
                      color: "#a96666",
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
          {/* RIEPILOGO */}
          {/* ======================== */}

          <div
            style={{
              marginBottom: "15px",
            }}
          >
            <div
              style={{
                color: "#6e5530",

                fontSize: "9px",
                fontWeight: "800",

                letterSpacing: "2.5px",

                marginBottom: "6px",
              }}
            >
              RIEPILOGO
            </div>

            <h2
              style={{
                color: "#cfcfcf",

                fontSize: "17px",
                fontWeight: "800",

                letterSpacing: ".5px",
              }}
            >
              Le tue statistiche
            </h2>
          </div>

          {/* ======================== */}
          {/* STATISTICHE */}
          {/* ======================== */}

          <div
            style={{
              display: "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",

              gap: "15px",

              marginBottom: "35px",
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

          <div
            className="card"
            style={{
              padding: "24px 27px",

              background: "#0d0d0d",

              border:
                "1px solid rgba(255,255,255,.055)",

              boxShadow:
                "0 10px 30px rgba(0,0,0,.22)",
            }}
          >
            <div
              style={{
                color: "#713737",

                fontSize: "9px",
                fontWeight: "800",

                letterSpacing: "2.5px",

                marginBottom: "9px",
              }}
            >
              ARMERIA 200
            </div>

            <div
              style={{
                color: "#d0d0d0",

                fontSize: "16px",
                fontWeight: "800",

                marginBottom: "8px",
              }}
            >
              Gestionale Dipendenti
            </div>

            <p
              style={{
                color: "#686868",

                fontSize: "12px",

                lineHeight: "1.7",

                margin: 0,

                maxWidth: "760px",
              }}
            >
              Utilizza il menu a sinistra
              per registrare fatture,
              effettuare ordini di import,
              consultare gli storici e
              controllare il tuo stipendio.
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

        background:
          "linear-gradient(145deg, #101010, #0b0b0b)",

        border:
          "1px solid rgba(255,255,255,.055)",

        boxShadow:
          "0 10px 28px rgba(0,0,0,.22)",
      }}
    >
      <div
        style={{
          color: "#727272",

          fontSize: "9px",
          fontWeight: "700",

          textTransform: "uppercase",

          letterSpacing: "1.3px",

          marginBottom: "11px",
        }}
      >
        {titolo}
      </div>

      <div
        style={{
          color: "#b18a4a",

          fontSize: "26px",
          fontWeight: "800",

          marginBottom: "10px",
        }}
      >
        {valore}
      </div>

      <div
        style={{
          color: "#565656",

          fontSize: "10px",
        }}
      >
        {descrizione}
      </div>
    </div>
  );
}
