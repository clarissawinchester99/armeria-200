"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

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

      // PROFILO
      const { data: profiloData, error: profiloError } =
        await supabase
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
        throw profiloError || new Error("Profilo non trovato");
      }

      // ACCOUNT DISATTIVATO
      if (!profiloData.attivo) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setProfilo(profiloData);

      // STATISTICHE
      const { data: statsData, error: statsError } =
        await supabase
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

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
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
    <main
      style={{
        minHeight: "100vh",
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
              ARMERIA 200
            </h1>

            <p className="subtitle">
              Gestionale dipendenti
            </p>
          </div>

          <button
            className="btn btn-dark"
            onClick={logout}
          >
            Logout
          </button>
        </div>

        {/* PROFILO */}

        <div
          className="card"
          style={{
            marginBottom: "25px",
            border:
              "1px solid rgba(139,30,30,.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
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
                  textTransform: "uppercase",
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
                    display: "inline-block",
                    background:
                      "rgba(139,30,30,.18)",
                    border:
                      "1px solid rgba(196,42,42,.35)",
                    color: "#e64b4b",
                    padding: "5px 10px",
                    borderRadius: "20px",
                    fontSize: "10px",
                    fontWeight: "900",
                    letterSpacing: "1px",
                    marginBottom: "8px",
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
          />

          <StatCard
            titolo="Stipendio maturato"
            valore={formattaSoldi(
              stats.stipendio
            )}
          />

          <StatCard
            titolo="Fatture effettuate"
            valore={stats.numero_fatture}
          />
        </div>

        {/* MENU */}

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
              "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "15px",
          }}
        >
          <MenuCard
            titolo="Nuova fattura"
            descrizione="Registra una nuova vendita dell'Armeria."
            bottone="Crea fattura"
            onClick={() =>
              router.push("/fatture")
            }
          />

          <MenuCard
            titolo="Storico fatture"
            descrizione="Visualizza le fatture già registrate."
            bottone="Apri storico"
            onClick={() =>
              router.push("/storico")
            }
          />

          <MenuCard
            titolo="Stipendio"
            descrizione={`Controlla il tuo stipendio maturato al ${profilo.percentuale_stipendio}%.`}
            bottone="Vedi stipendio"
            onClick={() =>
              router.push("/stipendio")
            }
          />

          {admin && (
            <MenuCard
              titolo="Pannello Admin"
              descrizione="Gestisci personale, ruoli, fatture e stipendi."
              bottone="Amministrazione"
              onClick={() =>
                router.push("/admin")
              }
              admin
            />
          )}
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
          fontSize: "28px",
          fontWeight: "900",
        }}
      >
        {valore}
      </div>
    </div>
  );
}

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
        minHeight: "200px",

        border: admin
          ? "1px solid rgba(139,30,30,.45)"
          : undefined,
      }}
    >
      <div
        style={{
          color: admin
            ? "#c42a2a"
            : "#fff",
          fontSize: "18px",
          fontWeight: "900",
          textTransform: "uppercase",
          letterSpacing: "1px",
          marginBottom: "10px",
        }}
      >
        {titolo}
      </div>

      <div
        style={{
          color: "#777",
          fontSize: "13px",
          lineHeight: "1.6",
          flex: 1,
        }}
      >
        {descrizione}
      </div>

      <button
        className={
          admin
            ? "btn btn-primary"
            : "btn btn-dark"
        }
        onClick={onClick}
        style={{
          marginTop: "20px",
          width: "100%",
        }}
      >
        {bottone}
      </button>
    </div>
  );
}
