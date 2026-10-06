"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const GRADI = {
  Dipendente: 20,
  Armaiolo: 25,
  "Vice-Direttore": 30,
  Direttore: 40,
  Proprietario: 45,
};

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
  const [creazioneDipendente, setCreazioneDipendente] = useState(false);

  const [nuovoDipendente, setNuovoDipendente] = useState({
    nome: "",
    cognome: "",
    username: "",
    password: "",
    grado: "Dipendente",
  });

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

      const { data: profiloData, error: profiloError } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

      if (profiloError || !profiloData) {
        throw profiloError || new Error("Profilo non trovato");
      }

      if (
        profiloData.ruolo !== "admin" ||
        !profiloData.attivo
      ) {
        router.replace("/dashboard");
        return;
      }

      setProfilo(profiloData);

      // STATISTICHE
      const { data: statsData, error: statsError } =
        await supabase
          .from("employee_stats")
          .select("*")
          .order("nome");

      if (statsError) {
        throw statsError;
      }

      // PROFILI
      const { data: profilesData, error: profilesError } =
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
          `);

      if (profilesError) {
        throw profilesError;
      }

      const dipendentiCompleti = (statsData || []).map(
        (stat) => {
          const p = (profilesData || []).find(
            (profilo) => profilo.id === stat.id
          );

          return {
            ...stat,
            username: p?.username || "",
            grado: p?.grado || "Dipendente",
            attivo: p?.attivo ?? true,
          };
        }
      );

      setDipendenti(dipendentiCompleti);

      // ULTIME FATTURE
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
              username,
              grado
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

  // ==================================================
  // CREA DIPENDENTE
  // ==================================================

  function modificaNuovoDipendente(campo, valore) {
    setNuovoDipendente((precedente) => ({
      ...precedente,
      [campo]: valore,
    }));
  }

  async function creaDipendente(e) {
    e.preventDefault();

    setErrore("");
    setSuccesso("");
    setCreazioneDipendente(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessione non valida.");
      }

      const response = await fetch(
        "/api/admin/create-user",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            nome: nuovoDipendente.nome,
            cognome: nuovoDipendente.cognome,
            username: nuovoDipendente.username,
            password: nuovoDipendente.password,
            grado: nuovoDipendente.grado,
          }),
        }
      );

      const risultato = await response.json();

      if (!response.ok) {
        throw new Error(
          risultato.error ||
            "Errore durante la creazione del dipendente."
        );
      }

      setSuccesso(
        `${nuovoDipendente.nome} ${nuovoDipendente.cognome} assunto come ${nuovoDipendente.grado} al ${GRADI[nuovoDipendente.grado]}%.`
      );

      setNuovoDipendente({
        nome: "",
        cognome: "",
        username: "",
        password: "",
        grado: "Dipendente",
      });

      await caricaAdmin();
    } catch (error) {
      console.error(error);

      setErrore(
        error.message ||
          "Errore durante la creazione del dipendente."
      );
    } finally {
      setCreazioneDipendente(false);
    }
  }

  // ==================================================
  // CAMBIO GRADO
  // ==================================================

  async function cambiaGrado(dipendente, nuovoGrado) {
    setErrore("");
    setSuccesso("");
    setSalvataggio(dipendente.id);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          grado: nuovoGrado,
        })
        .eq("id", dipendente.id);

      if (error) {
        throw error;
      }

      setSuccesso(
        `${nomeDipendente(dipendente)} ora è ${nuovoGrado} (${GRADI[nuovoGrado]}%).`
      );

      await caricaAdmin();
    } catch (error) {
      console.error(error);

      setErrore(
        "Errore durante la modifica del ruolo."
      );
    } finally {
      setSalvataggio(null);
    }
  }

  // ==================================================
  // ATTIVA / DISATTIVA
  // ==================================================

  async function cambiaStato(dipendente) {
    setErrore("");
    setSuccesso("");
    setSalvataggio(dipendente.id);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          attivo: !dipendente.attivo,
        })
        .eq("id", dipendente.id);

      if (error) {
        throw error;
      }

      setSuccesso(
        dipendente.attivo
          ? "Dipendente disattivato."
          : "Dipendente riattivato."
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

  // ==================================================
  // FATTURE
  // ==================================================

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
      "Vuoi ripristinare questa fattura?"
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

  // ==================================================
  // UTILITY
  // ==================================================

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

  function nomeDipendente(dipendente) {
    if (!dipendente) {
      return "Dipendente";
    }

    const nome =
      `${dipendente.nome || ""} ${dipendente.cognome || ""}`.trim();

    return nome || dipendente.username || "Dipendente";
  }

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <main className="page">
        <div>
          <h2>ARMERIA 200</h2>
          <p style={{ color: "#777", marginTop: "10px" }}>
            Caricamento pannello admin...
          </p>
        </div>
      </main>
    );
  }

  if (!profilo) {
    return null;
  }

  // ==================================================
  // TOTALI
  // ==================================================

  const fatturatoTotale = dipendenti.reduce(
    (totale, d) =>
      totale + Number(d.fatturato || 0),
    0
  );

  const stipendiTotali = dipendenti.reduce(
    (totale, d) =>
      totale + Number(d.stipendio || 0),
    0
  );

  const numeroFatture = dipendenti.reduce(
    (totale, d) =>
      totale + Number(d.numero_fatture || 0),
    0
  );

  const numeroDipendenti = dipendenti.filter(
    (d) => d.ruolo === "dipendente"
  ).length;

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
              Gestione dipendenti, ruoli, stipendi e fatture
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
            style={{ marginBottom: "20px" }}
          >
            {errore}
          </div>
        )}

        {successo && (
          <div
            className="success-message"
            style={{ marginBottom: "20px" }}
          >
            {successo}
          </div>
        )}

        {/* TOTALI */}

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
            valore={numeroDipendenti}
          />
        </div>

        {/* CREA DIPENDENTE */}

        <div
          className="card"
          style={{
            marginBottom: "40px",
            border:
              "1px solid rgba(139,30,30,.35)",
          }}
        >
          <div style={{ marginBottom: "25px" }}>
            <div
              style={{
                color: "#c42a2a",
                fontSize: "11px",
                fontWeight: "bold",
                letterSpacing: "3px",
                marginBottom: "7px",
              }}
            >
              NUOVA ASSUNZIONE
            </div>

            <h2
              style={{
                fontSize: "22px",
                textTransform: "uppercase",
              }}
            >
              Crea dipendente
            </h2>
          </div>

          <form onSubmit={creaDipendente}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "15px",
              }}
            >
              <div className="form-group">
                <label>Nome</label>

                <input
                  type="text"
                  value={nuovoDipendente.nome}
                  onChange={(e) =>
                    modificaNuovoDipendente(
                      "nome",
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Cognome</label>

                <input
                  type="text"
                  value={nuovoDipendente.cognome}
                  onChange={(e) =>
                    modificaNuovoDipendente(
                      "cognome",
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Username</label>

                <input
                  type="text"
                  value={nuovoDipendente.username}
                  onChange={(e) =>
                    modificaNuovoDipendente(
                      "username",
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>

                <input
                  type="password"
                  minLength={6}
                  value={nuovoDipendente.password}
                  onChange={(e) =>
                    modificaNuovoDipendente(
                      "password",
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              {/* TENDINA RUOLO */}

              <div className="form-group">
                <label>Ruolo</label>

                <select
                  value={nuovoDipendente.grado}
                  onChange={(e) =>
                    modificaNuovoDipendente(
                      "grado",
                      e.target.value
                    )
                  }
                >
                  <option value="Dipendente">
                    Dipendente — 20%
                  </option>

                  <option value="Armaiolo">
                    Armaiolo — 25%
                  </option>

                  <option value="Vice-Direttore">
                    Vice-Direttore — 30%
                  </option>

                  <option value="Direttore">
                    Direttore — 40%
                  </option>

                  <option value="Proprietario">
                    Proprietario — 45%
                  </option>
                </select>
              </div>
            </div>

            <div
              style={{
                color: "#777",
                fontSize: "13px",
                marginBottom: "18px",
              }}
            >
              Percentuale assegnata automaticamente:{" "}
              <strong style={{ color: "#c42a2a" }}>
                {GRADI[nuovoDipendente.grado]}%
              </strong>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={creazioneDipendente}
            >
              {creazioneDipendente
                ? "Creazione..."
                : "Assumi dipendente"}
            </button>
          </form>
        </div>

        {/* DIPENDENTI */}

        <h2
          style={{
            fontSize: "20px",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: "15px",
          }}
        >
          Personale
        </h2>

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
                    @{dipendente.username || "utente"}
                  </div>

                  <div
                    style={{
                      color: "#c42a2a",
                      fontWeight: "800",
                      fontSize: "13px",
                      marginTop: "7px",
                    }}
                  >
                    {dipendente.grado} —{" "}
                    {dipendente.percentuale_stipendio}%
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

              {/* CAMBIO RUOLO */}

              {dipendente.ruolo !== "admin" && (
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
                  <div style={{ width: "230px" }}>
                    <label>Ruolo lavorativo</label>

                    <select
                      value={dipendente.grado}
                      disabled={
                        salvataggio === dipendente.id
                      }
                      onChange={(e) =>
                        cambiaGrado(
                          dipendente,
                          e.target.value
                        )
                      }
                      style={{ marginTop: "7px" }}
                    >
                      <option value="Dipendente">
                        Dipendente — 20%
                      </option>

                      <option value="Armaiolo">
                        Armaiolo — 25%
                      </option>

                      <option value="Vice-Direttore">
                        Vice-Direttore — 30%
                      </option>

                      <option value="Direttore">
                        Direttore — 40%
                      </option>

                      <option value="Proprietario">
                        Proprietario — 45%
                      </option>
                    </select>
                  </div>

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
                </div>
              )}
            </div>
          ))}
        </div>

        {/* FATTURE */}

        <h2
          style={{
            fontSize: "20px",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: "15px",
          }}
        >
          Ultime fatture
        </h2>

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
                      {formattaSoldi(fattura.totale)}
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
                      {fattura.profiles?.grado}
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
