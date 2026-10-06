"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function FatturePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);

  const [utente, setUtente] = useState(null);
  const [profilo, setProfilo] = useState(null);

  const [categorie, setCategorie] = useState([]);
  const [prodotti, setProdotti] = useState([]);

  const [quantita, setQuantita] = useState({});

  const [errore, setErrore] = useState("");
  const [successo, setSuccesso] = useState("");

  useEffect(() => {
    inizializza();
  }, []);

  async function inizializza() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUtente(user);

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

      if (profiloError || !profiloData) {
        throw new Error(
          "Impossibile caricare il profilo del dipendente."
        );
      }

      if (!profiloData.attivo) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setProfilo(profiloData);

      // ==============================
      // CARICA CATEGORIE
      // ==============================

      const {
        data: categorieData,
        error: categorieError,
      } = await supabase
        .from("categories")
        .select("*")
        .eq("attiva", true)
        .order("ordine", {
          ascending: true,
        });

      if (categorieError) {
        throw categorieError;
      }

      // ==============================
      // CARICA PRODOTTI
      // ==============================

      const {
        data: prodottiData,
        error: prodottiError,
      } = await supabase
        .from("products")
        .select("*")
        .eq("attivo", true)
        .order("ordine", {
          ascending: true,
        })
        .order("nome", {
          ascending: true,
        });

      if (prodottiError) {
        throw prodottiError;
      }

      setCategorie(categorieData || []);
      setProdotti(prodottiData || []);
    } catch (error) {
      console.error(error);

      setErrore(
        error.message ||
          "Errore durante il caricamento dei prodotti."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // QUANTITÀ
  // ==============================

  function cambiaQuantita(productId, valore) {
    let numero = parseInt(valore, 10);

    if (isNaN(numero) || numero < 0) {
      numero = 0;
    }

    setQuantita((precedenti) => ({
      ...precedenti,
      [productId]: numero,
    }));
  }

  // ==============================
  // PRODOTTI SELEZIONATI
  // ==============================

  function prodottiSelezionati() {
    return prodotti
      .filter((prodotto) => {
        return Number(
          quantita[prodotto.id] || 0
        ) > 0;
      })
      .map((prodotto) => {
        const qta = Number(
          quantita[prodotto.id] || 0
        );

        return {
          ...prodotto,
          quantita: qta,

          subtotale:
            Number(prodotto.prezzo) *
            qta,
        };
      });
  }

  // ==============================
  // TOTALE
  // ==============================

  function calcolaTotale() {
    return prodottiSelezionati().reduce(
      (totale, prodotto) =>
        totale + prodotto.subtotale,
      0
    );
  }

  // ==============================
  // FORMATTA SOLDI
  // ==============================

  function formattaSoldi(numero) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(numero || 0));
  }

  // ==============================
  // CREA FATTURA
  // ==============================

  async function creaFattura() {
    setErrore("");
    setSuccesso("");

    const selezionati =
      prodottiSelezionati();

    if (selezionati.length === 0) {
      setErrore(
        "Seleziona almeno un prodotto."
      );
      return;
    }

    const totale = calcolaTotale();

    if (totale <= 0) {
      setErrore(
        "Il totale della fattura non è valido."
      );
      return;
    }

    if (!utente || !profilo) {
      setErrore(
        "Utente non valido. Effettua nuovamente il login."
      );
      return;
    }

    setSalvataggio(true);

    try {
      // ==============================
      // CREA FATTURA
      // ==============================
      //
      // Oltre all'ID del dipendente
      // salviamo una copia dei suoi dati.
      //
      // In questo modo, se il dipendente
      // verrà eliminato in futuro,
      // lo storico continuerà a sapere
      // chi aveva creato la fattura.
      // ==============================

      const {
        data: fattura,
        error: fatturaError,
      } = await supabase
        .from("invoices")
        .insert({
          employee_id: utente.id,

          employee_nome:
            profilo.nome || "",

          employee_cognome:
            profilo.cognome || "",

          employee_username:
            profilo.username || "",

          employee_grado:
            profilo.grado || "Dipendente",

          totale: totale,
        })
        .select()
        .single();

      if (fatturaError) {
        throw fatturaError;
      }

      // ==============================
      // CREA RIGHE DELLA FATTURA
      // ==============================
      //
      // Salviamo nome e prezzo attuali.
      // Se in futuro il catalogo cambia,
      // le vecchie fatture rimangono corrette.
      // ==============================

      const righe = selezionati.map(
        (prodotto) => ({
          invoice_id: fattura.id,

          product_id: prodotto.id,

          nome_prodotto:
            prodotto.nome,

          prezzo_unitario:
            Number(prodotto.prezzo),

          quantita:
            prodotto.quantita,

          subtotale:
            prodotto.subtotale,
        })
      );

      const { error: righeError } =
        await supabase
          .from("invoice_items")
          .insert(righe);

      if (righeError) {
        // Se le righe non vengono salvate,
        // eliminiamo la fattura incompleta.

        await supabase
          .from("invoices")
          .delete()
          .eq("id", fattura.id);

        throw righeError;
      }

      setSuccesso(
        "Fattura registrata correttamente."
      );

      setQuantita({});

      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    } catch (error) {
      console.error(error);

      setErrore(
        error.message ||
          "Errore durante la registrazione della fattura."
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
      <main className="page">
        <div>
          Caricamento prodotti...
        </div>
      </main>
    );
  }

  const totale = calcolaTotale();

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
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "35px",
          }}
        >
          <div>
            <div
              style={{
                color: "#8b1e1e",
                fontSize: "12px",
                fontWeight: "bold",
                letterSpacing: "4px",
                marginBottom: "6px",
              }}
            >
              ARMERIA 200
            </div>

            <h1 className="title">
              NUOVA FATTURA
            </h1>

            <p className="subtitle">
              Seleziona i prodotti venduti e
              inserisci le quantità.
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

        {/* EVENTUALE ERRORE */}

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

        {/* CATEGORIE */}

        {categorie.map((categoria) => {
          const prodottiCategoria =
            prodotti
              .filter(
                (prodotto) =>
                  Number(
                    prodotto.category_id
                  ) ===
                  Number(categoria.id)
              )
              .sort((a, b) => {
                const ordineA =
                  Number(a.ordine || 0);

                const ordineB =
                  Number(b.ordine || 0);

                if (
                  ordineA !== ordineB
                ) {
                  return ordineA - ordineB;
                }

                return a.nome.localeCompare(
                  b.nome,
                  "it"
                );
              });

          return (
            <div
              key={categoria.id}
              style={{
                marginBottom: "35px",
              }}
            >
              <h2
                style={{
                  fontSize: "18px",
                  textTransform:
                    "uppercase",
                  letterSpacing: "2px",
                  marginBottom: "15px",
                  paddingBottom: "10px",
                  borderBottom:
                    "1px solid #292929",
                }}
              >
                {categoria.nome}
              </h2>

              {prodottiCategoria.length ===
              0 ? (
                <div
                  className="card"
                  style={{
                    color: "#666",
                    fontSize: "13px",
                  }}
                >
                  Nessun prodotto disponibile
                  in questa categoria.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "15px",
                  }}
                >
                  {prodottiCategoria.map(
                    (prodotto) => {
                      const qta =
                        Number(
                          quantita[
                            prodotto.id
                          ] || 0
                        );

                      return (
                        <div
                          className="card"
                          key={prodotto.id}
                          style={{
                            padding: "20px",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              gap: "15px",
                              marginBottom:
                                "18px",
                            }}
                          >
                            <div>
                              <h3
                                style={{
                                  fontSize:
                                    "17px",
                                }}
                              >
                                {prodotto.nome}
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
                                Prezzo unitario
                              </div>
                            </div>

                            <div
                              style={{
                                color:
                                  "#c42a2a",
                                fontWeight:
                                  "bold",
                                fontSize:
                                  "17px",
                              }}
                            >
                              {formattaSoldi(
                                prodotto.prezzo
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
                            onChange={(e) =>
                              cambiaQuantita(
                                prodotto.id,
                                e.target.value
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
                                  "12px",
                                paddingTop:
                                  "12px",
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
                                  Number(
                                    prodotto.prezzo
                                  ) * qta
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
            </div>
          );
        })}

        {/* TOTALE */}

        <div
          className="card"
          style={{
            position: "sticky",
            bottom: "20px",
            marginTop: "30px",
            border:
              "1px solid rgba(139,30,30,.4)",
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
            <div>
              <div
                style={{
                  color: "#777",
                  fontSize: "11px",
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "2px",
                }}
              >
                Totale fattura
              </div>

              <div
                style={{
                  fontSize: "34px",
                  fontWeight: "900",
                  marginTop: "5px",
                }}
              >
                {formattaSoldi(
                  totale
                )}
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={creaFattura}
              disabled={
                salvataggio ||
                totale <= 0
              }
              style={{
                minWidth: "220px",
              }}
            >
              {salvataggio
                ? "REGISTRAZIONE..."
                : "REGISTRA FATTURA"}
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
  );
}
