"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";

export default function ImportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);

  const [utente, setUtente] = useState(null);
  const [profilo, setProfilo] = useState(null);

  const [materiali, setMateriali] = useState([]);
  const [quantita, setQuantita] = useState({});

  const [errore, setErrore] = useState("");
  const [successo, setSuccesso] = useState("");

  useEffect(() => {
    inizializza();
  }, []);

  async function inizializza() {
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

      // ==============================
      // CARICA PROFILO DIPENDENTE
      // ==============================

      const {
        data: profiloData,
        error: profiloError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          nome,
          cognome,
          username,
          grado,
          attivo
        `)
        .eq("id", user.id)
        .single();

      if (
        profiloError ||
        !profiloData
      ) {
        throw new Error(
          "Impossibile caricare il profilo del dipendente."
        );
      }

      if (!profiloData.attivo) {
        await supabase.auth.signOut();

        router.replace("/login");
        return;
      }

      // ==============================
      // CARICA MATERIALI IMPORT
      // ==============================

      const {
        data: materialiData,
        error: materialiError,
      } = await supabase
        .from("import_materials")
        .select(`
          id,
          nome,
          prezzo,
          ordine,
          attivo
        `)
        .eq("attivo", true)
        .order("ordine", {
          ascending: true,
        })
        .order("nome", {
          ascending: true,
        });

      if (materialiError) {
        throw materialiError;
      }

      setUtente(user);
      setProfilo(profiloData);
      setMateriali(materialiData || []);
    } catch (error) {
      console.error(error);

      setErrore(
        error.message ||
          "Errore durante il caricamento."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // QUANTITÀ
  // ==============================

  function cambiaQuantita(
    id,
    valore
  ) {
    let numero = parseInt(
      valore,
      10
    );

    if (
      isNaN(numero) ||
      numero < 0
    ) {
      numero = 0;
    }

    setQuantita(
      (precedenti) => ({
        ...precedenti,
        [id]: numero,
      })
    );
  }

  // ==============================
  // MATERIALI SELEZIONATI
  // ==============================

  function materialiSelezionati() {
    return materiali
      .filter((materiale) => {
        return (
          Number(
            quantita[
              materiale.id
            ] || 0
          ) > 0
        );
      })
      .map((materiale) => {
        const qta = Number(
          quantita[
            materiale.id
          ] || 0
        );

        const prezzo = Number(
          materiale.prezzo || 0
        );

        return {
          ...materiale,

          prezzo,

          quantita: qta,

          subtotale:
            prezzo * qta,
        };
      });
  }

  // ==============================
  // TOTALE
  // ==============================

  function calcolaTotale() {
    return materialiSelezionati().reduce(
      (
        totale,
        materiale
      ) =>
        totale +
        materiale.subtotale,
      0
    );
  }

  // ==============================
  // FORMATTA SOLDI
  // ==============================

  function formattaSoldi(numero) {
    return `$${new Intl.NumberFormat("it-IT", {
      maximumFractionDigits: 2,
    }).format(Number(numero || 0))}`;
  }

  // ==============================
  // REGISTRA IMPORT
  // ==============================

  async function registraImport() {
    setErrore("");
    setSuccesso("");

    const selezionati =
      materialiSelezionati();

    if (
      selezionati.length === 0
    ) {
      setErrore(
        "Inserisci almeno una quantità."
      );

      return;
    }

    const totale =
      calcolaTotale();

    if (totale <= 0) {
      setErrore(
        "Il totale dell'import non è valido."
      );

      return;
    }

    if (
      !utente ||
      !profilo
    ) {
      setErrore(
        "Sessione non valida."
      );

      return;
    }

    setSalvataggio(true);

    try {
      // ==============================
      // CREA IMPORT
      // ==============================

      const {
        data: nuovoImport,
        error: importError,
      } = await supabase
        .from("imports")
        .insert({
          employee_id:
            utente.id,

          employee_nome:
            profilo.nome || "",

          employee_cognome:
            profilo.cognome || "",

          employee_username:
            profilo.username || "",

          employee_grado:
            profilo.grado ||
            "Dipendente",

          totale: totale,
        })
        .select()
        .single();

      if (importError) {
        throw importError;
      }

      // ==============================
      // CREA MATERIALI IMPORT
      // ==============================

      const righe =
        selezionati.map(
          (materiale) => ({
            import_id:
              nuovoImport.id,

            materiale:
              materiale.nome,

            prezzo_unitario:
              materiale.prezzo,

            quantita:
              materiale.quantita,

            subtotale:
              materiale.subtotale,
          })
        );

      const {
        error: righeError,
      } = await supabase
        .from("import_items")
        .insert(righe);

      if (righeError) {
        await supabase
          .from("imports")
          .delete()
          .eq(
            "id",
            nuovoImport.id
          );

        throw righeError;
      }

      setSuccesso(
        "Import registrato correttamente."
      );

      setQuantita({});

      setTimeout(() => {
        router.push(
          "/dashboard"
        );

        router.refresh();
      }, 1200);
    } catch (error) {
      console.error(error);

      setErrore(
        error.message ||
          "Errore durante la registrazione dell'import."
      );
    } finally {
      setSalvataggio(false);
    }
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
            minHeight:
              "100vh",

            marginLeft:
              "250px",

            padding:
              "30px",
          }}
        >
          <div
            className="container"
            style={{
              maxWidth:
                "1100px",
            }}
          >
            Caricamento import...
          </div>
        </main>
      </>
    );
  }

  const totale =
    calcolaTotale();

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
              marginBottom:
                "35px",
            }}
          >
            <div
              style={{
                color:
                  "#c42a2a",

                fontSize:
                  "12px",

                fontWeight:
                  "bold",

                letterSpacing:
                  "4px",

                marginBottom:
                  "6px",
              }}
            >
              ARMERIA 200
            </div>

            <h1 className="title">
              NUOVO IMPORT
            </h1>

            <p className="subtitle">
              Registra un ordine
              di materiali per
              l'Armeria.
            </p>
          </div>

          {/* ERRORE CARICAMENTO */}

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

          {/* MATERIALI */}

          {materiali.length === 0 ? (
            <div
              className="card"
              style={{
                color: "#777",
              }}
            >
              Nessun materiale Import
              attivo disponibile.
            </div>
          ) : (
            <div
              style={{
                display: "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(250px, 1fr))",

                gap: "15px",
              }}
            >
              {materiali.map(
                (materiale) => {
                  const qta =
                    Number(
                      quantita[
                        materiale.id
                      ] || 0
                    );

                  const prezzo =
                    Number(
                      materiale.prezzo ||
                        0
                    );

                  const subtotale =
                    prezzo *
                    qta;

                  return (
                    <div
                      className="card"
                      key={
                        materiale.id
                      }
                      style={{
                        padding:
                          "20px",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          alignItems:
                            "flex-start",

                          gap: "15px",

                          marginBottom:
                            "20px",
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              fontSize:
                                "17px",
                            }}
                          >
                            {
                              materiale.nome
                            }
                          </h3>

                          <div
                            style={{
                              color:
                                "#777",

                              fontSize:
                                "12px",

                              marginTop:
                                "5px",
                            }}
                          >
                            Prezzo
                            unitario
                          </div>
                        </div>

                        <div
                          style={{
                            color:
                              "#c42a2a",

                            fontSize:
                              "18px",

                            fontWeight:
                              "900",
                          }}
                        >
                          {formattaSoldi(
                            prezzo
                          )}
                        </div>
                      </div>

                      <label>
                        Quantità
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={qta}
                        onChange={(
                          e
                        ) =>
                          cambiaQuantita(
                            materiale.id,
                            e.target
                              .value
                          )
                        }
                        style={{
                          marginTop:
                            "8px",
                        }}
                      />

                      {qta > 0 && (
                        <div
                          style={{
                            marginTop:
                              "15px",

                            paddingTop:
                              "15px",

                            borderTop:
                              "1px solid #222",

                            display:
                              "flex",

                            justifyContent:
                              "space-between",

                            color:
                              "#aaa",

                            fontSize:
                              "13px",
                          }}
                        >
                          <span>
                            Subtotale
                          </span>

                          <strong
                            style={{
                              color:
                                "#fff",
                            }}
                          >
                            {formattaSoldi(
                              subtotale
                            )}
                          </strong>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}

          {/* TOTALE */}

          <div
            className="card"
            style={{
              position:
                "sticky",

              bottom: "20px",

              marginTop:
                "30px",

              border:
                "1px solid rgba(139,30,30,.4)",

              boxShadow:
                "0 -10px 30px rgba(0,0,0,.25)",
            }}
          >
            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",

                gap: "25px",

                flexWrap:
                  "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    color:
                      "#777",

                    fontSize:
                      "11px",

                    textTransform:
                      "uppercase",

                    letterSpacing:
                      "2px",
                  }}
                >
                  Totale Import
                </div>

                <div
                  style={{
                    fontSize:
                      "34px",

                    fontWeight:
                      "900",

                    marginTop:
                      "5px",
                  }}
                >
                  {formattaSoldi(
                    totale
                  )}
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={
                  registraImport
                }
                disabled={
                  salvataggio ||
                  totale <= 0 ||
                  materiali.length ===
                    0
                }
                style={{
                  minWidth:
                    "220px",
                }}
              >
                {salvataggio
                  ? "REGISTRAZIONE..."
                  : "REGISTRA IMPORT"}
              </button>
            </div>

            {successo && (
              <div className="success-message">
                {successo}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
