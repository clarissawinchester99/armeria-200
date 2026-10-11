
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
  const [cicliStipendi, setCicliStipendi] = useState([]);

  const [fondoCassa, setFondoCassa] = useState(0);
  const [nuovoFondoCassa, setNuovoFondoCassa] = useState("");
  const [salvataggioFondo, setSalvataggioFondo] = useState(false);

  const [creazione, setCreazione] = useState(false);
  const [salvataggio, setSalvataggio] = useState(null);
  const [eliminazione, setEliminazione] = useState(null);
  const [azioneFattura, setAzioneFattura] = useState(null);

  const [pagamentoStipendio, setPagamentoStipendio] =
    useState(null);

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

      const { data: profilo, error: profiloError } =
        await supabase
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
        caricaCicliStipendi(),
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
      setErrore(
        "Inserisci un importo valido per il fondo cassa."
      );
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
      console.error(
        "Errore aggiornamento fondo cassa:",
        error
      );

      setErrore(
        error?.message ||
          "Errore durante l'aggiornamento del fondo cassa."
      );
    } finally {
      setSalvataggioFondo(false);
    }
  }

  // =========================================================
  // CICLI STIPENDI: REGISTRO SETTIMANALE
  // =========================================================

  async function caricaCicliStipendi() {
    const { data, error } = await supabase
      .from("cicli_stipendi")
      .select(
        "id, employee_id, employee_nome, employee_cognome, employee_username, employee_grado, percentuale_stipendio, periodo_da, periodo_a, numero_fatture, fatturato_periodo, stipendio_maturato, stato, pagato_il"
      )
      .order("periodo_da", { ascending: false });

    if (error) throw error;
    setCicliStipendi(data || []);
  }

  // =========================================================
  // DIPENDENTI
  // =========================================================

  async function caricaDipendenti() {
    const { data: profili, error: profiliError } =
      await supabase
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

      const response = await fetch(
        "/api/admin/create-user",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            nome: nuovoDipendente.nome.trim(),
            cognome: nuovoDipendente.cognome.trim(),
            username: nuovoDipendente.username
              .trim()
              .toLowerCase(),
            password: nuovoDipendente.password,
            grado: nuovoDipendente.grado,
          }),
        }
      );

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
      console.error(
        "Errore creazione dipendente:",
        error
      );

      setErrore(
        error?.message ||
          "Errore durante la creazione del dipendente."
      );
    } finally {
      setCreazione(false);
    }
  }

  // =========================================================
  // CAMBIA GRADO DIPENDENTE
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

      if (error) throw error;

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
  // ATTIVA / DISATTIVA DIPENDENTE
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

      if (error) throw error;

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
      `ATTENZIONE!\n\n` +
        `Vuoi eliminare definitivamente ${nomeCompleto} ` +
        `(@${dipendente.username})?\n\n` +
        `L'account non potrà più accedere al gestionale.\n\n` +
        `Le vecchie fatture, gli import e gli stipendi ` +
        `registrati resteranno nello storico.\n\n` +
        `Questa operazione non può essere annullata.`
    );

    if (!conferma) return;

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

      const response = await fetch(
        "/api/admin/delete-user",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            user_id: dipendente.id,
          }),
        }
      );

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
        caricaCicliStipendi(),
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
        { fattura_id: fattura.id }
      );

      if (error) throw error;

      setSuccesso("Fattura annullata correttamente.");

      await Promise.all([
        caricaFatture(),
        caricaDipendenti(),
        caricaFondoCassa(),
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
        { fattura_id: fattura.id }
      );

      if (error) throw error;

      setSuccesso("Fattura ripristinata correttamente.");

      await Promise.all([
        caricaFatture(),
        caricaDipendenti(),
        caricaFondoCassa(),
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
  // PAGA STIPENDIO SETTIMANALE O ARRETRATO
  // =========================================================

  async function pagaCicloStipendio(ciclo) {
    if (ciclo.stato === "pagato") {
      setErrore("Questo stipendio risulta già pagato.");
      return;
    }

    const importo = Number(ciclo.stipendio_maturato || 0);

    if (importo <= 0) {
      setErrore("Importo dello stipendio non valido.");
      return;
    }

    const nomeCompleto =
      `${ciclo.employee_nome || ""} ${
        ciclo.employee_cognome || ""
      }`.trim() ||
      ciclo.employee_username ||
      "Dipendente";

    const fineSettimana = new Date(
      new Date(ciclo.periodo_a).getTime() - 1000
    ).toISOString();

    const conferma = window.confirm(
      `CONFERMA PAGAMENTO STIPENDIO\n\n` +
        `Dipendente: ${nomeCompleto}\n` +
        `Periodo: ${formattaSoloData(ciclo.periodo_da)} - ` +
        `${formattaSoloData(fineSettimana)}\n` +
        `Fatturato: ${formattaSoldi(ciclo.fatturato_periodo)}\n` +
        `Percentuale: ${ciclo.percentuale_stipendio}%\n` +
        `Stipendio: ${formattaSoldi(importo)}\n\n` +
        `L'importo sarà sottratto dal Fondo Cassa.\n` +
        `Vuoi procedere?`
    );

    if (!conferma) return;

    setErrore("");
    setSuccesso("");
    setPagamentoStipendio(ciclo.id);

    try {
      const { error } = await supabase.rpc(
        "paga_ciclo_stipendio",
        { p_ciclo_id: ciclo.id }
      );

      if (error) throw error;

      await Promise.all([
        caricaCicliStipendi(),
        caricaFondoCassa(),
      ]);

      setSuccesso(
        `Stipendio di ${formattaSoldi(importo)} ` +
          `pagato a ${nomeCompleto}. ` +
          `Fondo Cassa aggiornato.`
      );
    } catch (error) {
      console.error("Errore pagamento stipendio:", error);

      setErrore(
        error?.message ||
          "Errore durante il pagamento dello stipendio."
      );
    } finally {
      setPagamentoStipendio(null);
    }
  }

  // =========================================================
  // ANNULLA PAGAMENTO STIPENDIO
  // =========================================================

  async function annullaPagamentoStipendio(ciclo) {
    if (ciclo.stato !== "pagato") {
      setErrore("Questo stipendio non risulta pagato.");
      return;
    }

    const nomeCompleto =
      `${ciclo.employee_nome || ""} ${
        ciclo.employee_cognome || ""
      }`.trim() ||
      ciclo.employee_username ||
      "Dipendente";

    const importo = Number(ciclo.stipendio_maturato || 0);

    const conferma = window.confirm(
      `ANNULLARE IL PAGAMENTO?\n\n` +
        `Dipendente: ${nomeCompleto}\n` +
        `Importo: ${formattaSoldi(importo)}\n` +
        `Periodo: ${formattaSoloData(ciclo.periodo_da)}\n\n` +
        `Lo stipendio tornerà DA PAGARE.\n` +
        `L'importo verrà restituito al Fondo Cassa.\n\n` +
        `Vuoi continuare?`
    );

    if (!conferma) return;

    setErrore("");
    setSuccesso("");
    setPagamentoStipendio(ciclo.id);

    try {
      const { error } = await supabase.rpc(
        "annulla_pagamento_ciclo",
        { p_ciclo_id: ciclo.id }
      );

      if (error) throw error;

      await Promise.all([
        caricaCicliStipendi(),
        caricaFondoCassa(),
      ]);

      setSuccesso(
        `Pagamento di ${nomeCompleto} annullato. ` +
          `${formattaSoldi(importo)} restituiti ` +
          `al Fondo Cassa.`
      );
    } catch (error) {
      console.error(
        "Errore annullamento pagamento:",
        error
      );

      setErrore(
        error?.message ||
          "Impossibile annullare il pagamento."
      );
    } finally {
      setPagamentoStipendio(null);
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
    if (!data) return "";

    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    }).format(new Date(data));
  }

  function formattaSoloData(data) {
    if (!data) return "";

    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Europe/Rome",
    }).format(new Date(data));
  }

  function datiStoriciFattura(fattura) {
    const profilo = fattura.profiles;

    const nomeProfilo =
      `${profilo?.nome || ""} ${
        profilo?.cognome || ""
      }`.trim();

    const nomeStorico =
      `${fattura.employee_nome || ""} ${
        fattura.employee_cognome || ""
      }`.trim();

    return {
      nome:
        nomeProfilo ||
        nomeStorico ||
        profilo?.username ||
        fattura.employee_username ||
        "Dipendente eliminato",

      username:
        profilo?.username ||
        fattura.employee_username ||
        "",

      grado:
        profilo?.grado ||
        fattura.employee_grado ||
        "Grado non disponibile",

      eliminato: !profilo,
    };
  }

  // =========================================================
  // CALCOLI GENERALI
  // =========================================================

  const fattureValide = fatture.filter(
    (fattura) => !fattura.annullata
  );

  const fatturatoTotale = fattureValide.reduce(
    (totale, fattura) =>
      totale + Number(fattura.totale || 0),
    0
  );

  const stipendiSettimana = dipendenti.reduce(
    (totale, dipendente) =>
      totale + Number(dipendente.stipendio || 0),
    0
  );

  const cicliDaPagare = cicliStipendi.filter(
    (ciclo) => ciclo.stato === "da_pagare"
  );

  const cicliPagati = cicliStipendi.filter(
    (ciclo) => ciclo.stato === "pagato"
  );

  const totaleArretrati = cicliDaPagare.reduce(
    (totale, ciclo) =>
      totale + Number(ciclo.stipendio_maturato || 0),
    0
  );

  const totaleStipendiPagati = cicliPagati.reduce(
    (totale, ciclo) =>
      totale + Number(ciclo.stipendio_maturato || 0),
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
  // CARICAMENTO PAGINA
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
            style={{ maxWidth: "1200px" }}
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
  // INIZIO PAGINA ADMIN
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
          style={{ maxWidth: "1200px" }}
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

            <h1 className="title">PANNELLO ADMIN</h1>

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

          {/* STATISTICHE GENERALI */}

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
              titolo="Stipendi settimana corrente"
              valore={formattaSoldi(stipendiSettimana)}
            />

            <StatCard
              titolo="Stipendi da pagare"
              valore={formattaSoldi(totaleArretrati)}
            />

            <StatCard
              titolo="Stipendi pagati"
              valore={formattaSoldi(totaleStipendiPagati)}
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
              Importo attualmente disponibile nella
              cassa dell&apos;Armeria.
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
                      setNuovoFondoCassa(event.target.value)
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
