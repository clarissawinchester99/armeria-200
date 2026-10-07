"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Sidebar from "../../../components/Sidebar";

export default function GestioneImportAdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [materiali, setMateriali] = useState([]);

  const [errore, setErrore] = useState("");
  const [successo, setSuccesso] = useState("");

  const [creazione, setCreazione] = useState(false);
  const [salvataggio, setSalvataggio] = useState(null);

  const [nuovoMateriale, setNuovoMateriale] = useState({
    nome: "",
    prezzo: "",
    ordine: 0,
  });

  useEffect(() => {
    caricaPagina();
  }, []);

  async function caricaPagina() {
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
          .select("ruolo, attivo")
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

      await caricaMateriali();
    } catch (error) {
      console.error(error);

      setErrore(
        "Errore durante il caricamento della gestione Import."
      );
    } finally {
      setLoading(false);
    }
  }

  async function caricaMateriali() {
    const { data, error } = await supabase
      .from("import_materials")
      .select(`
        id,
        nome,
        prezzo,
        ordine,
        attivo,
        created_at
      `)
      .order("ordine", {
        ascending: true,
      })
      .order("nome", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    setMateriali(data || []);
  }

  function formattaSoldi(numero) {
    return `$${new Intl.NumberFormat("it-IT", {
      maximumFractionDigits: 2,
    }).format(Number(numero || 0))}`;
  }

  // =========================================================
  // NUOVO MATERIALE
  // =========================================================

  function modificaNuovoMateriale(campo, valore) {
    setNuovoMateriale((precedente) => ({
      ...precedente,
      [campo]: valore,
    }));
  }

  async function creaMateriale(evento) {
    evento.preventDefault();

    setErrore("");
    setSuccesso("");
    setCreazione(true);

    try {
      const nome = String(
        nuovoMateriale.nome || ""
      )
        .trim()
        .toUpperCase();

      const prezzo = Number(
        nuovoMateriale.prezzo
      );

      const ordine = Number(
        nuovoMateriale.ordine || 0
      );

      if (!nome) {
        throw new Error(
          "Inserisci il nome del materiale."
        );
      }

      if (
        Number.isNaN(prezzo) ||
        prezzo < 0
      ) {
        throw new Error(
          "Inserisci un prezzo valido."
        );
      }

      if (
        Number.isNaN(ordine) ||
        ordine < 0
      ) {
        throw new Error(
          "Inserisci un ordine valido."
        );
      }

      const { error } = await supabase
        .from("import_materials")
        .insert({
          nome,
          prezzo,
          ordine,
          attivo: true,
        });

      if (error) {
        throw error;
      }

      setSuccesso(
        `${nome} aggiunto ai materiali Import.`
      );

      setNuovoMateriale({
        nome: "",
        prezzo: "",
        ordine: 0,
      });

      await caricaMateriali();
    } catch (error) {
      console.error(error);

      if (error.code === "23505") {
        setErrore(
          "Esiste già un materiale con questo nome."
        );
      } else {
        setErrore(
          error.message ||
            "Errore durante la creazione del materiale."
        );
      }
    } finally {
      setCreazione(false);
    }
  }

  // =========================================================
  // MODIFICA LOCALE
  // =========================================================

  function modificaMaterialeLocale(
    id,
    campo,
    valore
  ) {
    setMateriali((precedenti) =>
      precedenti.map((materiale) =>
        materiale.id === id
          ? {
              ...materiale,
              [campo]: valore,
            }
          : materiale
      )
    );
  }

  // =========================================================
  // SALVA MATERIALE
  // =========================================================

  async function salvaMateriale(materiale) {
    setErrore("");
    setSuccesso("");
    setSalvataggio(materiale.id);

    try {
      const nome = String(
        materiale.nome || ""
      )
        .trim()
        .toUpperCase();

      const prezzo = Number(
        materiale.prezzo
      );

      const ordine = Number(
        materiale.ordine || 0
      );

      if (!nome) {
        throw new Error(
          "Il nome del materiale non può essere vuoto."
        );
      }

      if (
        Number.isNaN(prezzo) ||
        prezzo < 0
      ) {
        throw new Error(
          "Il prezzo non è valido."
        );
      }

      if (
        Number.isNaN(ordine) ||
        ordine < 0
      ) {
        throw new Error(
          "L'ordine non è valido."
        );
      }

      const { error } = await supabase
        .from("import_materials")
        .update({
          nome,
          prezzo,
          ordine,
        })
        .eq("id", materiale.id);

      if (error) {
        throw error;
      }

      setSuccesso(
        `${nome} aggiornato correttamente.`
      );

      await caricaMateriali();
    } catch (error) {
      console.error(error);

      if (error.code === "23505") {
        setErrore(
          "Esiste già un materiale con questo nome."
        );
      } else {
        setErrore(
          error.message ||
            "Errore durante il salvataggio."
        );
      }
    } finally {
      setSalvataggio(null);
    }
  }

  // =========================================================
  // ATTIVA / DISATTIVA
  // =========================================================

  async function cambiaStatoMateriale(materiale) {
    setErrore("");
    setSuccesso("");
    setSalvataggio(materiale.id);

    try {
      const nuovoStato =
        !materiale.attivo;

      const { error } = await supabase
        .from("import_materials")
        .update({
          attivo: nuovoStato,
        })
        .eq("id", materiale.id);

      if (error) {
        throw error;
      }

      setSuccesso(
        nuovoStato
          ? `${materiale.nome} riattivato.`
          : `${materiale.nome} disattivato.`
      );

      await caricaMateriali();
    } catch (error) {
      console.error(error);

      setErrore(
        "Errore durante la modifica dello stato del materiale."
      );
    } finally {
      setSalvataggio(null);
    }
  }

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
              Caricamento gestione Import...
            </p>
          </div>
        </main>
      </>
    );
  }

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
              AMMINISTRAZIONE
            </div>

            <h1 className="title">
              GESTIONE IMPORT
            </h1>

            <p className="subtitle">
              Materiali e prezzi degli ordini
              dell&apos;Armeria 200
            </p>
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

          {/* NUOVO MATERIALE */}

          <div
            className="card"
            style={{
              marginBottom: "35px",
              border:
                "1px solid rgba(139,30,30,.35)",
            }}
          >
            <div
              style={{
                marginBottom: "22px",
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
                NUOVO MATERIALE
              </div>

              <h2>Aggiungi materiale</h2>

              <p
                style={{
                  color: "#777",
                  fontSize: "13px",
                  marginTop: "7px",
                }}
              >
                Aggiungi un nuovo pezzo alla lista
                utilizzata per gli ordini Import.
              </p>
            </div>

            <form onSubmit={creaMateriale}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "2fr 1fr 1fr",
                  gap: "15px",
                }}
              >
                <div className="form-group">
                  <label>
                    Nome materiale
                  </label>

                  <input
                    type="text"
                    value={
                      nuovoMateriale.nome
                    }
                    onChange={(evento) =>
                      modificaNuovoMateriale(
                        "nome",
                        evento.target.value
                      )
                    }
                    placeholder="es. CANNA"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Prezzo</label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      nuovoMateriale.prezzo
                    }
                    onChange={(evento) =>
                      modificaNuovoMateriale(
                        "prezzo",
                        evento.target.value
                      )
                    }
                    placeholder="es. 500"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Ordine</label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      nuovoMateriale.ordine
                    }
                    onChange={(evento) =>
                      modificaNuovoMateriale(
                        "ordine",
                        evento.target.value
                      )
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={creazione}
              >
                {creazione
                  ? "Aggiunta..."
                  : "Aggiungi materiale"}
              </button>
            </form>
          </div>

          {/* MATERIALI */}

          <div
            style={{
              marginBottom: "15px",
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "15px",
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
                MATERIALI IMPORT
              </div>

              <h2>Gestione materiali</h2>
            </div>

            <div
              style={{
                color: "#777",
                fontSize: "12px",
              }}
            >
              {materiali.length} materiali
            </div>
          </div>

          {materiali.length === 0 ? (
            <div className="card">
              <p
                style={{
                  color: "#777",
                }}
              >
                Nessun materiale presente.
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
              {materiali.map((materiale) => (
                <div
                  className="card"
                  key={materiale.id}
                  style={{
                    opacity:
                      materiale.attivo
                        ? 1
                        : 0.55,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "2fr 1fr 100px",
                      gap: "15px",
                      alignItems: "end",
                    }}
                  >
                    <div className="form-group">
                      <label>
                        Materiale
                      </label>

                      <input
                        type="text"
                        value={materiale.nome}
                        onChange={(evento) =>
                          modificaMaterialeLocale(
                            materiale.id,
                            "nome",
                            evento.target.value
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label>Prezzo</label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          materiale.prezzo
                        }
                        onChange={(evento) =>
                          modificaMaterialeLocale(
                            materiale.id,
                            "prezzo",
                            evento.target.value
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label>Ordine</label>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          materiale.ordine
                        }
                        onChange={(evento) =>
                          modificaMaterialeLocale(
                            materiale.id,
                            "ordine",
                            evento.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      color: "#777",
                      fontSize: "12px",
                      marginBottom: "15px",
                    }}
                  >
                    Prezzo attuale:{" "}
                    <strong
                      style={{
                        color: "#fff",
                      }}
                    >
                      {formattaSoldi(
                        materiale.prezzo
                      )}
                    </strong>

                    {!materiale.attivo &&
                      " • MATERIALE DISATTIVATO"}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="btn btn-primary"
                      disabled={
                        salvataggio ===
                        materiale.id
                      }
                      onClick={() =>
                        salvaMateriale(
                          materiale
                        )
                      }
                    >
                      {salvataggio ===
                      materiale.id
                        ? "Salvataggio..."
                        : "Salva modifiche"}
                    </button>

                    <button
                      className="btn btn-dark"
                      disabled={
                        salvataggio ===
                        materiale.id
                      }
                      onClick={() =>
                        cambiaStatoMateriale(
                          materiale
                        )
                      }
                    >
                      {materiale.attivo
                        ? "Disattiva"
                        : "Riattiva"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
