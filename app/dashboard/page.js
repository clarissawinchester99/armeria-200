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
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(numero || 0));
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
            <h2>ARMERIA 200</h2>

            <p
              style={{
                color: "#777",
                marginTop: "10px",
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
          {/* HEADER */}

          <div
            style={{
              marginBottom: "35px",
            }}
          >
            <div
              style={{
                color: "#c42a2a",
                fontSize: "12px",
                fontWeight: "bold",
                letterSpacing: "4px",
                marginBottom: "6px",
              }}
            >
              LOS SANTOS
            </div>

            <h1 className="title">
              DASHBOARD
            </h1>

            <p className="subtitle">
              Gestionale Armeria 200
            </p>
          </div>

          {/* PROFILO */}

          <div
            className="card"
            style={{
              marginBottom: "25px",

              border:
                "1px solid rgba(139,30,30,.35)",

              background:
                "linear-gradient(135deg, rgba(139,30,30,.08), rgba(0,0,0,0))",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#777",
                    fontSize: "11px",
                    textTransform:
                      "uppercase",
                    letterSpacing: "2px",
                    marginBottom: "8px",
                  }}
                >
                  Benvenuto
                </div>

                <div
                  style={{
                    fontSize: "26px",
                    fontWeight: "900",
                  }}
                >
                  {nomeCompleto ||
                    profilo.username}
                </div>

                <div
                  style={{
                    color: "#777",
                    fontSize: "13px",
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

                      background:
                        "rgba(139,30,30,.18)",

                      border:
                        "1px solid rgba(196,42,42,.35)",

                      color: "#e64b4b",

                      padding:
                        "5px 10px",

                      borderRadius:
                        "20px",

                      fontSize: "10px",

                      fontWeight:
                        "900",

                      letterSpacing:
                        "1px",

                      marginBottom:
                        "8px",
                    }}
                  >
                    ADMIN
                  </div>
                )}

                <div
                  style={{
                    color: "#fff",
                    fontSize: "18px",
                    fontWeight: "900",
                  }}
                >
                  {profilo.grado ||
                    "Dipendente"}
                </div>

                <div
                  style={{
                    color: "#c42a2a",
                    fontSize: "13px",
                    fontWeight: "800",
                    marginTop: "4px",
                  }}
                >
                  Stipendio{" "}
                  {
                    profilo.percentuale_stipendio
                  }
                  %
                </div>
              </div>
            </div>
          </div>

          {/* TITOLO STATISTICHE */}

          <div
            style={{
              marginBottom: "15px",
              marginTop: "35px",
            }}
          >
            <div
              style={{
                color: "#555",
                fontSize: "10px",
                fontWeight: "900",
                letterSpacing: "3px",
                marginBottom: "7px",
              }}
            >
              RIEPILOGO
            </div>

            <h2
              style={{
                fontSize: "18px",
                textTransform:
                  "uppercase",
                letterSpacing: "2px",
              }}
            >
              Le tue statistiche
            </h2>
          </div>

          {/* STATISTICHE */}

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

          {/* INFO */}

          <div
            className="card"
            style={{
              marginTop: "20px",
              border:
                "1px solid rgba(255,255,255,.05)",
            }}
          >
            <div
              style={{
                color: "#c42a2a",
                fontSize: "10px",
                fontWeight: "900",
                letterSpacing: "3px",
                marginBottom: "10px",
              }}
            >
              ARMERIA 200
            </div>

            <div
              style={{
                fontSize: "18px",
                fontWeight: "900",
                marginBottom: "8px",
              }}
            >
              Gestionale Dipendenti
            </div>

            <p
              style={{
                color: "#777",
                fontSize: "13px",
                lineHeight: "1.7",
                margin: 0,
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
      }}
    >
      <div
        style={{
          color: "#777",
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "1.5px",
          marginBottom: "10px",
        }}
      >
        {titolo}
      </div>

      <div
        style={{
          fontSize: "28px",
          fontWeight: "900",
          marginBottom: "10px",
        }}
      >
        {valore}
      </div>

      <div
        style={{
          color: "#555",
          fontSize: "11px",
        }}
      >
        {descrizione}
      </div>
    </div>
  );
}
