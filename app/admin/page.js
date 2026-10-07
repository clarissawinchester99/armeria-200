"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";

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
  const [errore, setErrore] = useState("");
  const [successo, setSuccesso] = useState("");

  const [dipendenti, setDipendenti] = useState([]);
  const [fatture, setFatture] = useState([]);
  const [imports, setImports] = useState([]);

  const [fondoCassa, setFondoCassa] = useState(0);
  const [nuovoFondoCassa, setNuovoFondoCassa] = useState("");
  const [salvataggioFondo, setSalvataggioFondo] = useState(false);

  const [creazione, setCreazione] = useState(false);
  const [salvataggio, setSalvataggio] = useState(null);
  const [eliminazione, setEliminazione] = useState(null);
  const [azioneFattura, setAzioneFattura] = useState(null);

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

  // =========================================================
  // CARICAMENTO GENERALE
  // =========================================================

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

      const { data: profilo, error: profiloError } = await supabase
        .from("profiles")
        .select("id, ruolo, attivo")
        .eq("id", user.id)
        .single();

      if (
        profiloError ||
        !profilo ||
        profilo.ruolo !== "admin" ||
        !profilo.attivo
      ) {
        router.replace("/dashboard");
        return;
      }

      await Promise.all([
        caricaDipendenti(),
        caricaFatture(),
        caricaImports(),
        caricaFondoCassa(),
      ]);
    } catch (error) {
      console.error("Errore caricamento Admin:", error);

      setErrore(
        error?.message ||
          "Errore durante il caricamento del pannello Admin."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // FONDO CASSA
  // =========================================================

  async function caricaFondoCassa() {
    const { data, error } = await supabase
      .from("impostazioni")
      .select("valore")
      .eq("chiave", "fondo_cassa")
      .single();

    if (error) {
      throw error;
    }

    const valore = Number(data?.valore || 0);

    setFondoCassa(valore);
    setNuovoFondoCassa(String(valore));
  }

  async function aggiornaFondoCassa(evento) {
    evento.preventDefault();

    setErrore("");
    setSuccesso("");

    const valore = Number(nuovoFondoCassa);

    if (
      nuovoFondoCassa === "" ||
      Number.isNaN(valore) ||
      valore < 0
    ) {
      setErrore("Inserisci un importo valido per il fondo cassa.");
      return;
    }

    setSalvataggioFondo(true);

    try {
      const { error } = await supabase
        .from("impostazioni")
        .update({
          valore: valore,
          updated_at: new Date().toISOString(),
        })
        .eq("chiave", "fondo_cassa");

      if (error) {
        throw error;
      }

      setFondoCassa(valore);
      setNuovoFondoCassa(String(valore));

      setSuccesso(
        `Fondo cassa aggiornato a ${formattaSoldi(valore)}.`
      );
    } catch (error) {
      console.error("Errore aggiornamento fondo cassa:", error);

      setErrore(
        error?.message ||
          "Errore durante l'aggiornamento del fondo cassa."
      );
    } finally {
      setSalvataggioFondo(false);
    }
  }

  // =========================================================
  // DIPENDENTI
  // =========================================================

  async function caricaDipendenti() {
    const { data: profili, error: profiliError } = await supabase
      .from("profiles")
      .select(`
        id,
        nome,
        cognome,
        username,
        ruolo,
        grado,
        percentuale_stipendio,
        attivo,
        created_at
      `)
      .order("created_at", {
        ascending: true,
      });

    if (profiliError) {
      throw profiliError;
    }

    const { data: statistiche, error: statisticheError } =
      await supabase
        .from("employee_stats")
        .select(`
          id,
          numero_fatture,
          fatturato,
          stipendio
        `);

    if (statisticheError) {
      throw statisticheError;
    }

    const statisticheMap = {};

    (statistiche || []).forEach((statistica) => {
      statisticheMap[statistica.id] = statistica;
    });

    const risultato = (profili || []).map((profilo) => ({
      ...profilo,

      numero_fatture: Number(
        statisticheMap[profilo.id]?.numero_fatture || 0
      ),

      fatturato: Number(
        statisticheMap[profilo.id]?.fatturato || 0
      ),

      stipendio: Number(
        statisticheMap[profilo.id]?.stipendio || 0
      ),
    }));

    setDipendenti(risultato);
  }

  // =========================================================
  // FATTURE
  // =========================================================

  async function caricaFatture() {
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id,
        employee_id,
        employee_nome,
        employee_cognome,
        employee_username,
        employee_grado,
        totale,
        annullata,
        created_at,
        profiles (
          nome,
          cognome,
          username,
          grado
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    setFatture(data || []);
  }

  // =========================================================
  // IMPORT
  // =========================================================

  async function caricaImports() {
    const { data, error } = await supabase
      .from("imports")
      .select(`
        id,
        employee_id,
        employee_nome,
        employee_cognome,
        employee_username,
        employee_grado,
        totale,
        annullato,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    setImports(data || []);
  }

  // =========================================================
  // CREA DIPENDENTE
  // =========================================================

  function modificaNuovoDipendente(campo, valore) {
    setNuovoDipendente((precedente) => ({
      ...precedente,
      [campo]: valore,
    }));
  }

  async function creaDipendente(evento) {
    evento.preventDefault();

    setErrore("");
    setSuccesso("");
    setCreazione(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Sessione non valida. Effettua nuovamente il login."
        );
      }

      const response = await fetch("/api/admin/create-user", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },

        body: JSON.stringify({
          nome: nuovoDipendente.nome.trim(),
          cognome: nuovoDipendente.cognome.trim(),
          username: nuovoDipendente.username.trim().toLowerCase(),
          password: nuovoDipendente.password,
          grado: nuovoDipendente.grado,
        }),
      });

      const risultato = await response.json();

      if (!response.ok) {
        throw new Error(
          risultato?.error ||
            "Errore durante la creazione del dipendente."
        );
      }

      setSuccesso(
        `${nuovoDipendente.nome} ${nuovoDipendente.cognome} creato correttamente.`
      );

      setNuovoDipendente({
        nome: "",
        cognome: "",
        username: "",
        password: "",
        grado: "Dipendente",
      });

      await caricaDipendenti();
    } catch (error) {
      console.error("Errore creazione dipendente:", error);

      setErrore(
        error?.message ||
          "Errore durante la creazione del dipendente."
      );
    } finally {
      setCreazione(false);
    }
  }

  // =========================================================
  // CAMBIA GRADO
  // =========================================================

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
        `${dipendente.nome} ${dipendente.cognome} ora è ${nuovoGrado} (${GRADI[nuovoGrado]}%).`
      );

      await caricaDipendenti();
    } catch (error) {
      console.error("Errore modifica grado:", error);

      setErrore(
        error?.message ||
          "Errore durante la modifica del grado."
      );
    } finally {
      setSalvataggio(null);
    }
  }

  // =========================================================
  // ATTIVA / DISATTIVA
  // =========================================================

  async function cambiaStatoDipendente(dipendente) {
    setErrore("");
    setSuccesso("");
    setSalvataggio(dipendente.id);

    try {
      const nuovoStato = !dipendente.attivo;

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
          ? `${dipendente.nome} ${dipendente.cognome} riattivato.`
          : `${dipendente.nome} ${dipendente.cognome} disattivato.`
      );

      await caricaDipendenti();
    } catch (error) {
      console.error("Errore modifica stato:", error);

      setErrore(
        error?.message ||
          "Errore durante la modifica dello stato."
      );
    } finally {
      setSalvataggio(null);
    }
  }

  // =========================================================
  // ELIMINA DIPENDENTE
  // =========================================================

  async function eliminaDipendente(dipendente) {
    const nomeCompleto =
      `${dipendente.nome || ""} ${
        dipendente.cognome || ""
      }`.trim();

    const conferma = window.confirm(
      `ATTENZIONE!\n\nVuoi eliminare definitivamente ${nomeCompleto} (@${dipendente.username})?\n\nL'account non potrà più accedere al gestionale.\n\nLe sue vecchie fatture e i suoi import resteranno nello storico.\n\nQuesta operazione non può essere annullata.`
    );

    if (!conferma) {
      return;
    }

    setErrore("");
    setSuccesso("");
    setEliminazione(dipendente.id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Sessione non valida. Effettua nuovamente il login."
        );
      }

      const response = await fetch("/api/admin/delete-user", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },

        body: JSON.stringify({
          user_id: dipendente.id,
        }),
      });

      let risultato = {};

      try {
        risultato = await response.json();
      } catch {
        risultato = {};
      }

      if (!response.ok) {
        throw new Error(
          risultato?.error ||
            `Errore eliminazione dipendente (${response.status}).`
        );
      }

      setSuccesso(
        `${nomeCompleto} eliminato definitivamente.`
      );

      await Promise.all([
        caricaDipendenti(),
        caricaFatture(),
        caricaImports(),
      ]);
    } catch (error) {
      console.error("Errore eliminazione dipendente:", error);

      setErrore(
        error?.message ||
          "Errore durante l'eliminazione del dipendente."
      );
    } finally {
      setEliminazione(null);
    }
  }

  // =========================================================
  // ANNULLA FATTURA
  // =========================================================

  async function annullaFattura(fattura) {
    setErrore("");
    setSuccesso("");
    setAzioneFattura(fattura.id);

    try {
      const { error } = await supabase.rpc(
        "annulla_fattura",
        {
          fattura_id: fattura.id,
        }
      );

      if (error) {
        throw error;
      }

      setSuccesso("Fattura annullata correttamente.");

      await Promise.all([
        caricaFatture(),
        caricaDipendenti(),
      ]);
    } catch (error) {
      console.error("Errore annullamento fattura:", error);

      setErrore(
        error?.message ||
          "Errore durante l'annullamento della fattura."
      );
    } finally {
      setAzioneFattura(null);
    }
  }

  // =========================================================
  // RIPRISTINA FATTURA
  // =========================================================

  async function ripristinaFattura(fattura) {
    setErrore("");
    setSuccesso("");
    setAzioneFattura(fattura.id);

    try {
      const { error } = await supabase.rpc(
        "ripristina_fattura",
        {
          fattura_id: fattura.id,
        }
      );

      if (error) {
        throw error;
      }

      setSuccesso("Fattura ripristinata correttamente.");

      await Promise.all([
        caricaFatture(),
        caricaDipendenti(),
      ]);
    } catch (error) {
      console.error("Errore ripristino fattura:", error);

      setErrore(
        error?.message ||
          "Errore durante il ripristino della fattura."
      );
    } finally {
      setAzioneFattura(null);
    }
  }

  // =========================================================
  // FORMATTAZIONE
  // =========================================================

  function formattaSoldi(numero) {
    return `$${new Intl.NumberFormat("it-IT", {
      maximumFractionDigits: 2,
    }).format(Number(numero || 0))}`;
  }

  function formattaData(data) {
    if (!data) {
      return "";
    }

    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(data));
  }

  function datiStoriciFattura(fattura) {
    const nomeProfilo =
      `${fattura.profiles?.nome || ""} ${
        fattura.profiles?.cognome || ""
      }`.trim();

    const nomeStorico =
      `${fattura.employee_nome || ""} ${
        fattura.employee_cognome || ""
      }`.trim();

    return {
      nome:
        nomeProfilo ||
        nomeStorico ||
        fattura.profiles?.username ||
        fattura.employee_username ||
        "Dipendente eliminato",

      username:
        fattura.profiles?.username ||
        fattura.employee_username ||
        "",

      grado:
        fattura.profiles?.grado ||
        fattura.employee_grado ||
        "Grado non disponibile",

      eliminato: !fattura.employee_id,
    };
  }

  // =========================================================
  // TOTALI
  // =========================================================

  const fattureValide = fatture.filter(
    (fattura) => !fattura.annullata
  );

  const fatturatoTotale = fattureValide.reduce(
    (totale, fattura) =>
      totale + Number(fattura.totale || 0),
    0
  );

  const stipendiTotali = dipendenti.reduce(
    (totale, dipendente) =>
      totale + Number(dipendente.stipendio || 0),
    0
  );

  const importValidi = imports.filter(
    (ordine) => !ordine.annullato
  );

  const totaleImport = importValidi.reduce(
    (totale, ordine) =>
      totale + Number(ordine.totale || 0),
    0
  );

  // =========================================================
  // LOADING
  // =========================================================

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
              maxWidth: "1200px",
            }}
          >
            <h2>ARMERIA 200</h2>

            <p
              style={{
                color: "#777",
                marginTop: "10px",
              }}
            >
              Caricamento pannello Admin...
            </p>
          </div>
        </main>
      </>
    );
  }

  // =========================================================
  // PAGINA
  // =========================================================

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
            maxWidth: "1200px",
          }}
        >
          {/* HEADER */}

          <div style={{ marginBottom: "35px" }}>
            <div
              style={{
                color: "#c42a2a",
                fontSize: "12px",
                fontWeight: "bold",
                letterSpacing: "4px",
                marginBottom: "6px",
              }}
            >
              ARMERIA 200
            </div>

            <h1 className="title">
              PANNELLO ADMIN
            </h1>

            <p className="subtitle">
              Gestione completa dell&apos;Armeria
            </p>
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

          {/* STATISTICHE */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "15px",
              marginBottom: "35px",
            }}
          >
            <StatCard
              titolo="Fondo Cassa"
              valore={formattaSoldi(fondoCassa)}
            />

            <StatCard
              titolo="Fatturato totale"
              valore={formattaSoldi(fatturatoTotale)}
            />

            <StatCard
              titolo="Fatture valide"
              valore={fattureValide.length}
            />

            <StatCard
              titolo="Stipendi maturati"
              valore={formattaSoldi(stipendiTotali)}
            />

            <StatCard
              titolo="Personale"
              valore={dipendenti.length}
            />

            <StatCard
              titolo="Import validi"
              valore={importValidi.length}
            />

            <StatCard
              titolo="Totale Import"
              valore={formattaSoldi(totaleImport)}
            />
          </div>

          {/* FONDO CASSA */}

          <div
            className="card"
            style={{
              marginBottom: "35px",
              border: "1px solid rgba(139,30,30,.45)",
            }}
          >
            <div
              style={{
                color: "#c42a2a",
                fontSize: "11px",
                fontWeight: "bold",
                letterSpacing: "3px",
                marginBottom: "7px",
              }}
            >
              CONTABILITÀ
            </div>

            <h2>Fondo Cassa</h2>

            <p
              style={{
                color: "#777",
                fontSize: "13px",
                marginTop: "7px",
                marginBottom: "22px",
              }}
            >
              Importo attualmente disponibile nella cassa
              dell&apos;Armeria.
            </p>

            <div
              style={{
                fontSize: "34px",
                fontWeight: "900",
                marginBottom: "22px",
              }}
            >
              {formattaSoldi(fondoCassa)}
            </div>

            <form onSubmit={aggiornaFondoCassa}>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <div
                  className="form-group"
                  style={{
                    marginBottom: 0,
                    minWidth: "260px",
                    flex: "1",
                  }}
                >
                  <label>Nuovo fondo cassa ($)</label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={nuovoFondoCassa}
                    onChange={(event) =>
                      setNuovoFondoCassa(
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={salvataggioFondo}
                >
                  {salvataggioFondo
                    ? "Salvataggio..."
                    : "Aggiorna Fondo Cassa"}
                </button>
              </div>
            </form>
          </div>

          {/* IMPORT */}

          <div
            className="card"
            style={{
              marginBottom: "20px",
              border: "1px solid rgba(139,30,30,.35)",
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
                    color: "#c42a2a",
                    fontSize: "11px",
                    fontWeight: "bold",
                    letterSpacing: "3px",
                    marginBottom: "7px",
                  }}
                >
                  ORDINI MATERIALI
                </div>

                <h2>Gestione Import</h2>

                <p
                  style={{
                    color: "#777",
                    fontSize: "13px",
                    marginTop: "7px",
                  }}
                >
                  Visualizza, controlla e gestisci gli
                  ordini dei materiali dell&apos;Armeria.
                </p>
              </div>

              <button
                className="btn btn-primary"
                onClick={() =>
                  router.push("/storico-import")
                }
              >
                Storico Import
              </button>
            </div>
          </div>

          {/* CATALOGO */}

          <div
            className="card"
            style={{
              marginBottom: "35px",
              border: "1px solid rgba(139,30,30,.35)",
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
                    color: "#c42a2a",
                    fontSize: "11px",
                    fontWeight: "bold",
                    letterSpacing: "3px",
                    marginBottom: "7px",
                  }}
                >
                  CATALOGO ARMERIA
                </div>

                <h2>Gestione Prodotti</h2>

                <p
                  style={{
                    color: "#777",
                    fontSize: "13px",
                    marginTop: "7px",
                  }}
                >
                  Aggiungi prodotti, modifica prezzi e
                  gestisci gli articoli disponibili.
                </p>
              </div>

              <button
                className="btn btn-primary"
                onClick={() =>
                  router.push("/admin/catalogo")
                }
              >
                Gestisci Catalogo
              </button>
            </div>
          </div>

          {/* ASSUMI DIPENDENTE */}

          <div
            className="card"
            style={{ marginBottom: "35px" }}
          >
            <div
              style={{
                color: "#c42a2a",
                fontSize: "11px",
                fontWeight: "bold",
                letterSpacing: "3px",
                marginBottom: "7px",
              }}
            >
              PERSONALE
            </div>

            <h2 style={{ marginBottom: "22px" }}>
              Assumi dipendente
            </h2>

            <form onSubmit={creaDipendente}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "15px",
                }}
              >
                <Campo
                  label="Nome"
                  value={nuovoDipendente.nome}
                  onChange={(value) =>
                    modificaNuovoDipendente(
                      "nome",
                      value
                    )
                  }
                />

                <Campo
                  label="Cognome"
                  value={nuovoDipendente.cognome}
                  onChange={(value) =>
                    modificaNuovoDipendente(
                      "cognome",
                      value
                    )
                  }
                />

                <Campo
                  label="Username"
                  value={nuovoDipendente.username}
                  onChange={(value) =>
                    modificaNuovoDipendente(
                      "username",
                      value
                    )
                  }
                />

                <Campo
                  label="Password"
                  type="password"
                  minLength={6}
                  value={nuovoDipendente.password}
                  onChange={(value) =>
                    modificaNuovoDipendente(
                      "password",
                      value
                    )
                  }
                />

                <div className="form-group">
                  <label>Grado</label>

                  <select
                    value={nuovoDipendente.grado}
                    onChange={(event) =>
                      modificaNuovoDipendente(
                        "grado",
                        event.target.value
                      )
                    }
                  >
                    {Object.entries(GRADI).map(
                      ([grado, percentuale]) => (
                        <option
                          key={grado}
                          value={grado}
                        >
                          {grado} — {percentuale}%
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={creazione}
              >
                {creazione
                  ? "Creazione..."
                  : "Assumi Dipendente"}
              </button>
            </form>
          </div>

          {/* PERSONALE */}

          <div style={{ marginBottom: "40px" }}>
            <h2
              style={{
                marginBottom: "15px",
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              Personale
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "15px",
              }}
            >
              {dipendenti.map((dipendente) => (
                <div
                  className="card"
                  key={dipendente.id}
                  style={{
                    opacity: dipendente.attivo
                      ? 1
                      : 0.55,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "15px",
                      marginBottom: "15px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "900",
                        }}
                      >
                        {dipendente.nome}{" "}
                        {dipendente.cognome}
                      </div>

                      <div
                        style={{
                          color: "#777",
                          fontSize: "12px",
                          marginTop: "4px",
                        }}
                      >
                        @{dipendente.username || "—"}
                      </div>
                    </div>

                    <div
                      style={{
                        color: dipendente.attivo
                          ? "#c42a2a"
                          : "#777",
                        fontSize: "11px",
                        fontWeight: "900",
                      }}
                    >
                      {dipendente.attivo
                        ? "ATTIVO"
                        : "DISATTIVATO"}
                    </div>
                  </div>

                  <div
                    style={{
                      color: "#aaa",
                      fontSize: "13px",
                      lineHeight: "1.8",
                      marginBottom: "15px",
                    }}
                  >
                    <div>
                      Grado:{" "}
                      <strong style={{ color: "#fff" }}>
                        {dipendente.grado}
                      </strong>
                    </div>

                    <div>
                      Percentuale:{" "}
                      <strong style={{ color: "#fff" }}>
                        {dipendente.percentuale_stipendio}%
                      </strong>
                    </div>

                    <div>
                      Fatture:{" "}
                      <strong style={{ color: "#fff" }}>
                        {dipendente.numero_fatture}
                      </strong>
                    </div>

                    <div>
                      Fatturato:{" "}
                      <strong style={{ color: "#fff" }}>
                        {formattaSoldi(
                          dipendente.fatturato
                        )}
                      </strong>
                    </div>

                    <div>
                      Stipendio:{" "}
                      <strong style={{ color: "#fff" }}>
                        {formattaSoldi(
                          dipendente.stipendio
                        )}
                      </strong>
                    </div>
                  </div>

                  {dipendente.ruolo !== "admin" ? (
                    <>
                      <div className="form-group">
                        <label>Grado</label>

                        <select
                          value={dipendente.grado}
                          disabled={
                            salvataggio ===
                              dipendente.id ||
                            eliminazione ===
                              dipendente.id
                          }
                          onChange={(event) =>
                            cambiaGrado(
                              dipendente,
                              event.target.value
                            )
                          }
                        >
                          {Object.entries(GRADI).map(
                            ([grado, percentuale]) => (
                              <option
                                key={grado}
                                value={grado}
                              >
                                {grado} — {percentuale}%
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          className="btn btn-dark"
                          disabled={
                            salvataggio ===
                              dipendente.id ||
                            eliminazione ===
                              dipendente.id
                          }
                          onClick={() =>
                            cambiaStatoDipendente(
                              dipendente
                            )
                          }
                        >
                          {dipendente.attivo
                            ? "Disattiva Dipendente"
                            : "Riattiva Dipendente"}
                        </button>

                        <button
                          className="btn btn-primary"
                          disabled={
                            eliminazione ===
                              dipendente.id ||
                            salvataggio ===
                              dipendente.id
                          }
                          onClick={() =>
                            eliminaDipendente(
                              dipendente
                            )
                          }
                          style={{
                            background: "#7a1010",
                            borderColor: "#a51d1d",
                          }}
                        >
                          {eliminazione ===
                          dipendente.id
                            ? "Eliminazione..."
                            : "Elimina definitivamente"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        color: "#c42a2a",
                        fontSize: "11px",
                        fontWeight: "900",
                        letterSpacing: "2px",
                      }}
                    >
                      ACCOUNT AMMINISTRATORE
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ULTIME FATTURE */}

          <div>
            <h2
              style={{
                marginBottom: "15px",
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              Ultime Fatture
            </h2>

            {fatture.length === 0 ? (
              <div className="card">
                <p style={{ color: "#777" }}>
                  Nessuna fattura registrata.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {fatture.map((fattura) => {
                  const dati =
                    datiStoriciFattura(fattura);

                  return (
                    <div
                      className="card"
                      key={fattura.id}
                      style={{
                        opacity: fattura.annullata
                          ? 0.55
                          : 1,
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
                              fontWeight: "900",
                              fontSize: "16px",
                            }}
                          >
                            {dati.nome}
                          </div>

                          {dati.username && (
                            <div
                              style={{
                                color: "#777",
                                fontSize: "11px",
                                marginTop: "3px",
                              }}
                            >
                              @{dati.username}
                            </div>
                          )}

                          <div
                            style={{
                              color: "#777",
                              fontSize: "12px",
                              marginTop: "4px",
                            }}
                          >
                            {dati.grado}

                            {dati.eliminato && (
                              <>
                                {" • "}

                                <span
                                  style={{
                                    color: "#c42a2a",
                                    fontWeight: "900",
                                  }}
                                >
                                  ACCOUNT ELIMINATO
                                </span>
                              </>
                            )}

                            {" • "}

                            {formattaData(
                              fattura.created_at
                            )}
                          </div>

                          {fattura.annullata && (
                            <div
                              style={{
                                color: "#c42a2a",
                                fontWeight: "900",
                                fontSize: "11px",
                                marginTop: "7px",
                              }}
                            >
                              FATTURA ANNULLATA
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "15px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "20px",
                              fontWeight: "900",
                            }}
                          >
                            {formattaSoldi(
                              fattura.totale
                            )}
                          </div>

                          {fattura.annullata ? (
                            <button
                              className="btn btn-dark"
                              disabled={
                                azioneFattura ===
                                fattura.id
                              }
                              onClick={() =>
                                ripristinaFattura(
                                  fattura
                                )
                              }
                            >
                              {azioneFattura ===
                              fattura.id
                                ? "Attendi..."
                                : "Ripristina"}
                            </button>
                          ) : (
                            <button
                              className="btn btn-dark"
                              disabled={
                                azioneFattura ===
                                fattura.id
                              }
                              onClick={() =>
                                annullaFattura(
                                  fattura
                                )
                              }
                            >
                              {azioneFattura ===
                              fattura.id
                                ? "Attendi..."
                                : "Annulla"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

// =========================================================
// CAMPO FORM
// =========================================================

function Campo({
  label,
  value,
  onChange,
  type = "text",
  minLength,
}) {
  return (
    <div className="form-group">
      <label>{label}</label>

      <input
        type={type}
        value={value}
        minLength={minLength}
        onChange={(event) =>
          onChange(event.target.value)
        }
        required
      />
    </div>
  );
}

// =========================================================
// CARD STATISTICA
// =========================================================

function StatCard({ titolo, valore }) {
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
