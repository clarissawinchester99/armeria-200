"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function FatturePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);

  const [utente, setUtente] = useState(null);
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

      const { data: categorieData, error: categorieError } =
        await supabase
          .from("categories")
          .select("*")
          .eq("attiva", true)
          .order("ordine");

      if (categorieError) {
        throw categorieError;
      }

      const { data: prodottiData, error: prodottiError } =
        await supabase
          .from("products")
          .select("*")
          .eq("attivo", true)
          .order("nome");

      if (prodottiError) {
        throw prodottiError;
      }

      setCategorie(categorieData || []);
      setProdotti(prodottiData || []);
    } catch (error) {
      console.error(error);
      setErrore("Errore durante il caricamento dei prodotti.");
    } finally {
      setLoading(false);
    }
  }

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

  function prodottiSelezionati() {
    return prodotti
      .filter((prodotto) => {
        return Number(quantita[prodotto.id] || 0) > 0;
      })
      .map((prodotto) => {
        const qta = Number(
          quantita[prodotto.id] || 0
        );

        return {
          ...prodotto,
          quantita: qta,
          subtotale:
            Number(prodotto.prezzo) * qta,
        };
      });
  }

  function calcolaTotale() {
    return prodottiSelezionati().reduce(
      (totale, prodotto) =>
        totale + prodotto.subtotale,
      0
    );
  }

  function formattaSoldi(numero) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(numero || 0);
  }

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

    setSalvataggio(true);

    try {
      // CREA FATTURA

      const { data: fattura, error: fatturaError } =
        await supabase
          .from("invoices")
          .insert({
            employee_id: utente.id,
            totale: totale,
          })
          .select()
          .single();

      if (fatturaError) {
        throw fatturaError;
      }

      // CREA RIGHE FATTURA

      const righe = selezionati.map(
        (prodotto) => ({
          invoice_id: fattura.id,

          product_id: prodotto.id,

          nome_prodotto: prodotto.nome,

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
        // Se falliscono le righe,
        // eliminiamo la fattura appena creata.
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
        "Errore durante la registrazione della fattura."
      );
    } finally {
      setSalvataggio(false);
    }
  }

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

        {/* CATEGORIE */}

        {categorie.map((categoria) => {
          const prodottiCategoria =
            prodotti.filter(
              (prodotto) =>
                prodotto.category_id ===
                categoria.id
            );

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
                  textTransform: "uppercase",
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
                  Nessun prodotto
                  disponibile in questa
                  categoria.
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
                                {
                                  prodotto.nome
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
              justifyContent: "space-between",
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

          {errore && (
            <div className="error-message">
              {errore}
            </div>
          )}

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
