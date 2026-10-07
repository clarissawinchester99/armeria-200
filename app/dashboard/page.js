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
              maxWidth: "1180px",
            }}
          >
            <div
              style={{
                color: "#d99a2b",
                fontSize: "22px",
                fontWeight: "900",
                letterSpacing: "1px",
              }}
            >
              ARMERIA 200
            </div>

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
            maxWidth: "1180px",
          }}
        >
          {/* ======================== */}
          {/* BANNER */}
          {/* ======================== */}

          <div
            style={{
              position: "relative",

              width: "100%",
              height: "300px",

              marginBottom: "28px",

              borderRadius: "10px",

              overflow: "hidden",

              border:
                "1px solid rgba(217,154,43,.30)",

              backgroundColor: "#050505",

              backgroundImage:
                "linear-gradient(90deg, rgba(0,0,0,.80) 0%, rgba(0,0,0,.35) 45%, rgba(0,0,0,.12) 100%), url('/armeria-banner.png')",

              backgroundSize: "cover",

              backgroundPosition: "center",

              boxShadow:
                "0 20px 55px rgba(0,0,0,.60), 0 0 28px rgba(180,14,14,.10)",
            }}
          >
            {/* OMBRA BASSA */}

            <div
              style={{
                position: "absolute",

                left: 0,
                right: 0,
                bottom: 0,

                height: "120px",

                background:
                  "linear-gradient(transparent, rgba(0,0,0,.88))",

                pointerEvents: "none",
              }}
            />

            {/* LINEA SUPERIORE */}

            <div
              style={{
                position: "absolute",

                top: 0,
                left: 0,
                right: 0,

                height: "3px",

                background:
                  "linear-gradient(90deg, #7b0808, #ed1c16, #d99a2b, #ed1c16, #7b0808)",

                boxShadow:
                  "0 0 15px rgba(237,28,22,.45)",
              }}
            />

            {/* TESTO BANNER */}

            <div
              style={{
                position: "absolute",

                left: "32px",
                bottom: "28px",

                zIndex: 2,
              }}
            >
              <div
                style={{
                  color: "#d99a2b",

                  fontSize: "10px",
                  fontWeight: "900",

                  letterSpacing: "4px",

                  marginBottom: "8px",

                  textTransform: "uppercase",
                }}
              >
                Gestionale Dipendenti
              </div>

              <div
                style={{
                  color: "#ffffff",

                  fontSize: "30px",
                  fontWeight: "900",

                  letterSpacing: "1px",

                  lineHeight: "1.1",

                  textShadow:
                    "0 3px 10px rgba(0,0,0,.95)",
                }}
              >
                DASHBOARD
              </div>

              <div
                style={{
                  width: "85px",
                  height: "2px",

                  marginTop: "13px",

                  background:
                    "linear-gradient(90deg, #ed1c16, #d99a2b)",
                }}
              />
            </div>
          </div>

          {/* ======================== */}
          {/* PROFILO */}
          {/* ======================== */}

          <div
            className="card"
            style={{
              marginBottom: "28px",

              padding: "25px 28px",

              border:
                "1px solid rgba(217,154,43,.20)",

              background:
                "linear-gradient(110deg, rgba(125,8,8,.10), rgba(12,12,12,.96) 45%, rgba(217,154,43,.025))",
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
                    color: "#9a8353",

                    fontSize: "9px",
                    fontWeight: "900",

                    textTransform:
                      "uppercase",

                    letterSpacing: "2.5px",

                    marginBottom: "8px",
                  }}
                >
                  Benvenuto
                </div>

                <div
                  style={{
                    color: "#f5f5f5",

                    fontSize: "25px",
                    fontWeight: "900",

                    letterSpacing: ".4px",
                  }}
                >
                  {nomeCompleto ||
                    profilo.username}
                </div>

                <div
                  style={{
                    color: "#707070",

                    fontSize: "12px",

                    marginTop: "5px",
                  }}
                >
                  @{profilo.username}
                </div>
              </div>

              {/* GRADO */}

              <div
                style={{
                  textAlign: "right",
                }}
              >
                {admin && (
                  <div
                    style={{
                      display:
                        "inline-flex",

                      alignItems:
                        "center",

                      gap: "6px",

                      background:
                        "linear-gradient(90deg, rgba(155,10,10,.20), rgba(217,154,43,.07))",

                      border:
                        "1px solid rgba(217,154,43,.25)",

                      color: "#d99a2b",

                      padding:
                        "4px 9px",

                      borderRadius:
                        "4px",

                      fontSize: "8px",

                      fontWeight:
                        "900",

                      letterSpacing:
                        "1.5px",

                      marginBottom:
                        "8px",
                    }}
                  >
                    <span
                      style={{
                        width: "5px",
                        height: "5px",

                        borderRadius:
                          "50%",

                        background:
                          "#ed1c16",

                        boxShadow:
                          "0 0 6px #ed1c16",
                      }}
                    />

                    ADMIN
                  </div>
                )}

                <div
                  style={{
                    color: "#d99a2b",

                    fontSize: "18px",
                    fontWeight: "900",

                    letterSpacing: ".5px",
                  }}
                >
                  {profilo.grado ||
                    "Dipendente"}
                </div>

                <div
                  style={{
                    color: "#b3b3b3",

                    fontSize: "11px",
                    fontWeight: "700",

                    marginTop: "5px",
                  }}
                >
                  Percentuale stipendio{" "}
                  <span
                    style={{
                      color: "#ed1c16",
                      fontWeight: "900",
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
          {/* TITOLO STATISTICHE */}
          {/* ======================== */}

          <div
            style={{
              display: "flex",

              alignItems: "center",

              gap: "12px",

              marginTop: "34px",
              marginBottom: "17px",
            }}
          >
            <div>
              <div
                style={{
                  color: "#9a1111",

                  fontSize: "9px",
                  fontWeight: "900",

                  letterSpacing: "3px",

                  marginBottom: "5px",
                }}
              >
                RIEPILOGO
              </div>

              <h2
                style={{
                  color: "#e5e5e5",

                  fontSize: "17px",

                  textTransform:
                    "uppercase",

                  letterSpacing: "1px",
                }}
              >
                Le tue statistiche
              </h2>
            </div>

            <div
              style={{
                flex: 1,
                height: "1px",

                marginTop: "15px",

                background:
                  "linear-gradient(90deg, rgba(217,154,43,.25), rgba(180,14,14,.10), transparent)",
              }}
            />
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
              simbolo="$"
              titolo="Fatturato personale"
              valore={formattaSoldi(
                stats.fatturato
              )}
              descrizione="Totale delle tue fatture valide"
            />

            <StatCard
              simbolo="%"
              titolo="Stipendio maturato"
              valore={formattaSoldi(
                stats.stipendio
              )}
              descrizione={`Calcolato al ${profilo.percentuale_stipendio}%`}
            />

            <StatCard
              simbolo="#"
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
              marginTop: "20px",

              padding: "25px 28px",

              border:
                "1px solid rgba(217,154,43,.12)",

              background:
                "linear-gradient(135deg, rgba(15,15,15,.97), rgba(7,7,7,.98))",
            }}
          >
            <div
              style={{
                display: "flex",

                alignItems: "center",

                gap: "8px",

                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  width: "22px",
                  height: "2px",

                  background: "#ed1c16",
                }}
              />

              <div
                style={{
                  color: "#d99a2b",

                  fontSize: "9px",
                  fontWeight: "900",

                  letterSpacing: "3px",
                }}
              >
                ARMERIA 200
              </div>
            </div>

            <div
              style={{
                color: "#eeeeee",

                fontSize: "17px",
                fontWeight: "900",

                marginBottom: "8px",
              }}
            >
              Gestionale Dipendenti
            </div>

            <p
              style={{
                color: "#777",

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
  simbolo,
  titolo,
  valore,
  descrizione,
}) {
  return (
    <div
      className="card"
      style={{
        position: "relative",

        minHeight: "150px",

        padding: "22px",

        overflow: "hidden",

        border:
          "1px solid rgba(217,154,43,.14)",

        background:
          "linear-gradient(145deg, rgba(17,17,17,.98), rgba(7,7,7,.98))",
      }}
    >
      {/* SIMBOLO */}

      <div
        style={{
          position: "absolute",

          top: "17px",
          right: "18px",

          width: "30px",
          height: "30px",

          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          border:
            "1px solid rgba(180,14,14,.30)",

          borderRadius: "5px",

          background:
            "rgba(125,8,8,.10)",

          color: "#a91712",

          fontSize: "13px",
          fontWeight: "900",
        }}
      >
        {simbolo}
      </div>

      {/* TITOLO */}

      <div
        style={{
          color: "#8d8d8d",

          fontSize: "9px",
          fontWeight: "800",

          textTransform: "uppercase",

          letterSpacing: "1.5px",

          marginBottom: "12px",

          paddingRight: "40px",
        }}
      >
        {titolo}
      </div>

      {/* VALORE */}

      <div
        style={{
          color: "#d99a2b",

          fontSize: "27px",
          fontWeight: "900",

          marginBottom: "10px",

          letterSpacing: ".3px",

          textShadow:
            "0 2px 8px rgba(0,0,0,.6)",
        }}
      >
        {valore}
      </div>

      {/* DESCRIZIONE */}

      <div
        style={{
          color: "#595959",

          fontSize: "10px",
        }}
      >
        {descrizione}
      </div>

      {/* DETTAGLIO IN BASSO */}

      <div
        style={{
          position: "absolute",

          left: "22px",
          bottom: 0,

          width: "55px",
          height: "2px",

          background:
            "linear-gradient(90deg, #a90d0d, #d99a2b)",
        }}
      />
    </div>
  );
}
