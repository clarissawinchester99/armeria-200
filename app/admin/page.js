"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profilo, setProfilo] = useState(null);
  const [dipendenti, setDipendenti] = useState([]);
  const [fatture, setFatture] = useState([]);

  const [errore, setErrore] = useState("");
  const [successo, setSuccesso] = useState("");

  const [salvataggio, setSalvataggio] = useState(null);
  const [operazioneFattura, setOperazioneFattura] = useState(null);

  useEffect(() => {
    caricaAdmin();
  }, []);

  async function caricaAdmin() {
    setLoading(true);
    setErrore("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // PROFILO UTENTE

      const { data: profiloData, error: profiloError } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

      if (profiloError || !profiloData) {
        throw profiloError || new Error("Profilo non trovato");
      }

      if (profiloData.ruolo !== "admin") {
        router.replace("/dashboard");
        return;
      }

      setProfilo(profiloData);

      // STATISTICHE DIPENDENTI

      const { data: statsData, error: statsError } =
        await supabase
          .from("employee_stats")
          .select("*")
          .order("nome");

      if (statsError) {
        throw statsError;
      }

      // RECUPERIAMO ANCHE USERNAME E STATO ATTIVO

      const { data: profilesData, error: profilesError } =
        await supabase
          .from("profiles")
          .select(`
            id,
            username,
            nome,
            cognome,
            ruolo,
            percentuale_stipendio,
            attivo
          `);

      if (profilesError) {
        throw profilesError;
      }

      const dipendentiCompleti = (statsData || []).map((stat) => {
        const p = (profilesData || []).find(
          (profilo) => profilo.id === stat.id
        );

        return {
          ...stat,
          username: p?.username || "",
          attivo: p?.attivo ?? true,
        };
      });

      setDipendenti(dipendentiCompleti);

      // FATTURE

      const { data: fattureData, error: fattureError } =
        await supabase
          .from("invoices")
          .select(`
            id,
            totale,
            annullata,
            created_at,
            employee_id,
            profiles (
              nome,
              cognome,
              username
            )
          `)
          .order("created_at", {
            ascending: false,
          })
          .limit(30);

      if (fattureError) {
        throw fattureError;
      }

      setFatture(fattureData || []);
    } catch (error) {
      console.error("Errore admin:", error);

      setErrore(
        "Errore durante il caricamento del pannello amministratore."
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

  function formattaData(data) {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(data));
  }

  function nomeDipendente(profilo) {
    if (!profilo) return "Dipendente";

    const nome =
      `${profilo.nome || ""} ${profilo.cognome || ""}`.trim();

    return nome || profilo.username || "Dipendente";
  }

  function cambiaPercentualeLocale(id, valore) {
    let percentuale = Number(valore);

    if (Number.isNaN(percentuale)) {
      percentuale = 0;
    }

    if (percentuale < 0) {
      percentuale = 0;
    }

    if (percentuale > 100) {
      percentuale = 100;
    }

    setDipendenti((precedenti) =>
      precedenti.map((dipendente) =>
        dipendente.id === id
          ? {
              ...dipendente,
              percentuale_stipendio: percentuale,
            }
          : dipendente
      )
    );
  }

  async function salvaPercentuale(dipendente) {
    setErrore("");
    setSuccesso("");
    setSalvataggio(dipendente.id);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          percentuale_stipendio:
            Number(dipendente.percentuale_stipendio || 0),
        })
        .eq("id", dipendente.id);

      if (error) {
        throw error;
      }

      setSuccesso(
        `Percentuale di ${nomeDipendente(
          dipendente
        )} aggiornata correttamente.`
      );

      await caricaAdmin();
    } catch (error) {
      console.error(error);

      setErrore(
        "Errore durante la modifica della percentuale."
      );
    } finally {
      setSalvataggio(null);
    }
  }

  async function cambiaStato(dipendente) {
    setErrore("");
    setSuccesso("");
    setSalvataggio(dipendente.id);

    const nuovoStato = !dipendente.attivo;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          attivo: nuovoStato,
        })
        .eq("id", dipendente.id);

      if (error) {
        throw error;
      }

      setSuccesso(
        nuovoStato
          ? "Dipendente riattivato."
          : "Dipendente disattivato."
      );

      await caricaAdmin();
    } catch (error) {
      console.error(error);

      setErrore(
        "Errore durante la modifica dello stato del dipendente."
      );
    } finally {
      setSalvataggio(null);
    }
  }

  async function annullaFattura(id) {
    const conferma = window.confirm(
      "Vuoi annullare questa fattura? Non verrà più conteggiata nel fatturato e nello stipendio."
    );

    if (!conferma) return;

    setErrore("");
    setSuccesso("");
    setOperazioneFattura(id);

    try {
      const { error } = await supabase.rpc(
        "annulla_fattura",
        {
          fattura_id: id,
        }
      );

      if (error) {
        throw error;
      }

      setSuccesso("Fattura annullata correttamente.");

      await caricaAdmin();
    } catch (error) {
      console.error(error);

      setErrore(
        "Errore durante l'annullamento della fattura."
      );
    } finally {
      setOperazioneFattura(null);
    }
  }

  async function ripristinaFattura(id) {
    const conferma = window.confirm(
      "Vuoi ripristinare questa fattura? Tornerà a essere conteggiata nel fatturato e nello stipendio."
    );

    if (!conferma) return;

    setErrore("");
    setSuccesso("");
    setOperazioneFattura(id);

    try {
      const { error } = await supabase.rpc(
        "ripristina_fattura",
        {
          fattura_id: id,
        }
      );

      if (error) {
        throw error;
      }

      setSuccesso("Fattura ripristinata correttamente.");

      await caricaAdmin();
    } catch (error) {
      console.error(error);

      setErrore(
        "Errore durante il ripristino della fattura."
      );
    } finally {
      setOperazioneFattura(null);
    }
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
            Caricamento pannello admin...
          </p>
        </div>
      </main>
    );
  }

  if (!profilo) {
    return null;
  }

  const fatturatoTotale = dipendenti.reduce(
    (totale, dipendente) =>
      totale + Number(dipendente.fatturato || 0),
    0
  );

  const stipendiTotali = dipendenti.reduce(
    (totale, dipendente) =>
      totale + Number(dipendente.stipendio || 0),
    0
  );

  const numeroFatture = dipendenti.reduce(
    (totale, dipendente) =>
      totale + Number(dipendente.numero_fatture || 0),
    0
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "30px",
      }}
    >
      <div className="container">

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
              AMMINISTRAZIONE
            </div>

            <h1 className="title">
              ARMERIA 200
            </h1>

            <p className="subtitle">
              Gestione dipendenti, stipendi e fatture
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

        {/* MESSAGGI */}

        {errore && (
          <div
            className="error-message"
            style={{
              marginBottom: "20px",
            }}
          >
            {errore}
          </div>
        )}

        {successo && (
          <div
            className="success-message"
            style={{
              marginBottom: "20px",
            }}
          >
            {successo}
          </div>
        )}

        {/* TOTALI AZIENDA */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "15px",
            marginBottom: "35px",
          }}
        >
          <StatCard
            titolo="Fatturato totale"
            valore={formattaSoldi(fatturatoTotale)}
          />

          <StatCard
            titolo="Stipendi maturati"
            valore={formattaSoldi(stipendiTotali)}
          />

          <StatCard
            titolo="Fatture totali"
            valore={numeroFatture}
          />

          <StatCard
            titolo="Dipendenti"
            valore={
              dipendenti.filter(
                (d) => d.ruolo === "dipendente"
              ).length
            }
          />
        </div>

        {/* DIPENDENTI */}

        <div
          style={{
            marginBottom: "15px",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            Dipendenti
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            marginBottom: "45px",
          }}
        >
          {dipendenti.map((dipendente) => (
            <div
              className="card"
              key={dipendente.id}
              style={{
                opacity: dipendente.attivo ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(180px, 1.5fr) repeat(3, minmax(110px, 1fr))",
                  gap: "20px",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "800",
                    }}
                  >
                    {nomeDipendente(dipendente)}
                  </div>

                  <div
                    style={{
                      color: "#777",
                      fontSize: "12px",
                      marginTop: "5px",
                    }}
                  >
                    @{dipendente.username || "utente"} •{" "}
                    {dipendente.ruolo === "admin"
                      ? "Amministratore"
                      : "Dipendente"}
                  </div>

                  {!dipendente.attivo && (
                    <div
                      style={{
                        color: "#d34b4b",
                        fontSize: "11px",
                        fontWeight: "bold",
                        marginTop: "7px",
                      }}
                    >
                      ACCOUNT DISATTIVATO
                    </div>
                  )}
                </div>

                <MiniDato
                  titolo="Fatturato"
                  valore={formattaSoldi(
                    dipendente.fatturato
                  )}
                />

                <MiniDato
                  titolo="Stipendio"
                  valore={formattaSoldi(
                    dipendente.stipendio
                  )}
                />

                <MiniDato
                  titolo="Fatture"
                  valore={dipendente.numero_fatture}
                />
              </div>

              <div
                style={{
                  borderTop: "1px solid #242424",
                  marginTop: "20px",
                  paddingTop: "20px",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: "180px",
                  }}
                >
                  <label>
                    % Stipendio
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={
                      dipendente.percentuale_stipendio
                    }
                    onChange={(e) =>
                      cambiaPercentualeLocale(
                        dipendente.id,
                        e.target.value
                      )
                    }
                    style={{
                      marginTop: "7px",
                    }}
                  />
                </div>

                <button
                  className="btn btn-primary"
                  disabled={
                    salvataggio === dipendente.id
                  }
                  onClick={() =>
                    salvaPercentuale(dipendente)
                  }
                >
                  Salva percentuale
                </button>

                {dipendente.ruolo !== "admin" && (
                  <button
                    className="btn btn-dark"
                    disabled={
                      salvataggio === dipendente.id
                    }
                    onClick={() =>
                      cambiaStato(dipendente)
                    }
                  >
                    {dipendente.attivo
                      ? "Disattiva"
                      : "Riattiva"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ULTIME FATTURE */}

        <div
          style={{
            marginBottom: "15px",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            Ultime fatture
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {fatture.length === 0 ? (
            <div className="card">
              Nessuna fattura registrata.
            </div>
          ) : (
            fatture.map((fattura) => (
              <div
                className="card"
                key={fattura.id}
                style={{
                  padding: "20px",
                  opacity: fattura.annullata
                    ? 0.55
                    : 1,
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
                        fontSize: "19px",
                        fontWeight: "800",
                      }}
                    >
                      {formattaSoldi(
                        fattura.totale
                      )}
                    </div>

                    <div
                      style={{
                        color: "#777",
                        fontSize: "12px",
                        marginTop: "5px",
                      }}
                    >
                      {nomeDipendente(
                        fattura.profiles
                      )}
                      {" • "}
                      {formattaData(
                        fattura.created_at
                      )}
                    </div>

                    {fattura.annullata && (
                      <div
                        style={{
                          color: "#d34b4b",
                          fontSize: "11px",
                          fontWeight: "bold",
                          marginTop: "7px",
                          letterSpacing: "1px",
                        }}
                      >
                        FATTURA ANNULLATA
                      </div>
                    )}
                  </div>

                  {fattura.annullata ? (
                    <button
                      className="btn btn-dark"
                      disabled={
                        operazioneFattura ===
                        fattura.id
                      }
                      onClick={() =>
                        ripristinaFattura(
                          fattura.id
                        )
                      }
                    >
                      Ripristina
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      disabled={
                        operazioneFattura ===
                        fattura.id
                      }
                      onClick={() =>
                        annullaFattura(
                          fattura.id
                        )
                      }
                    >
                      Annulla fattura
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({ titolo, valore }) {
  return (
    <div className="card">
      <div
        style={{
          color: "#777",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "1.5px",
          marginBottom: "9px",
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

function MiniDato({ titolo, valore }) {
  return (
    <div>
      <div
        style={{
          color: "#777",
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}
      >
        {titolo}
      </div>

      <div
        style={{
          fontWeight: "800",
          marginTop: "5px",
        }}
      >
        {valore}
      </div>
    </div>
  );
}
