"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function CatalogoAdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [categorie, setCategorie] = useState([]);
  const [prodotti, setProdotti] = useState([]);

  const [errore, setErrore] = useState("");
  const [successo, setSuccesso] = useState("");
  const [salvataggio, setSalvataggio] = useState(null);
  const [creazione, setCreazione] = useState(false);

  const [nuovoProdotto, setNuovoProdotto] = useState({
    nome: "",
    prezzo: "",
    category_id: "",
    ordine: 0,
  });

  useEffect(() => {
    caricaCatalogo();
  }, []);

  async function caricaCatalogo() {
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

      const { data: categorieData, error: categorieError } =
        await supabase
          .from("categories")
          .select("*")
          .order("ordine", {
            ascending: true,
          });

      if (categorieError) {
        throw categorieError;
      }

      setCategorie(categorieData || []);

      const { data: prodottiData, error: prodottiError } =
        await supabase
          .from("products")
          .select(`
            id,
            nome,
            prezzo,
            category_id,
            attivo,
            ordine,
            categories (
              nome,
              ordine
            )
          `)
          .order("ordine", {
            ascending: true,
          });

      if (prodottiError) {
        throw prodottiError;
      }

      const ordinati = (prodottiData || []).sort((a, b) => {
        const ordineCategoriaA =
          Number(a.categories?.ordine || 0);

        const ordineCategoriaB =
          Number(b.categories?.ordine || 0);

        if (ordineCategoriaA !== ordineCategoriaB) {
          return ordineCategoriaA - ordineCategoriaB;
        }

        return Number(a.ordine || 0) - Number(b.ordine || 0);
      });

      setProdotti(ordinati);

      setNuovoProdotto((precedente) => ({
        ...precedente,
        category_id:
          precedente.category_id ||
          categorieData?.[0]?.id ||
          "",
      }));
    } catch (error) {
      console.error(error);

      setErrore(
        "Errore durante il caricamento del catalogo."
      );
    } finally {
      setLoading(false);
    }
  }

  function formattaSoldi(numero) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(Number(numero || 0));
  }

  function modificaNuovoProdotto(campo, valore) {
    setNuovoProdotto((precedente) => ({
      ...precedente,
      [campo]: valore,
    }));
  }

  async function creaProdotto(e) {
    e.preventDefault();

    setErrore("");
    setSuccesso("");
    setCreazione(true);

    try {
      const nome = nuovoProdotto.nome.trim();
      const prezzo = Number(nuovoProdotto.prezzo);
      const categoryId = Number(
        nuovoProdotto.category_id
      );
      const ordine = Number(
        nuovoProdotto.ordine || 0
      );

      if (!nome) {
        throw new Error(
          "Inserisci il nome del prodotto."
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

      if (!categoryId) {
        throw new Error(
          "Seleziona una categoria."
        );
      }

      const { error } = await supabase
        .from("products")
        .insert({
          nome,
          prezzo,
          category_id: categoryId,
          ordine,
          attivo: true,
        });

      if (error) {
        throw error;
      }

      setSuccesso(
        `${nome} aggiunto al catalogo.`
      );

      setNuovoProdotto({
        nome: "",
        prezzo: "",
        category_id:
          categorie[0]?.id || "",
        ordine: 0,
      });

      await caricaCatalogo();
    } catch (error) {
      console.error(error);

      if (error.code === "23505") {
        setErrore(
          "Questo prodotto esiste già nella categoria selezionata."
        );
      } else {
        setErrore(
          error.message ||
            "Errore durante la creazione del prodotto."
        );
      }
    } finally {
      setCreazione(false);
    }
  }

  function modificaProdottoLocale(id, campo, valore) {
    setProdotti((precedenti) =>
      precedenti.map((prodotto) =>
        prodotto.id === id
          ? {
              ...prodotto,
              [campo]: valore,
            }
          : prodotto
      )
    );
  }

  async function salvaProdotto(prodotto) {
    setErrore("");
    setSuccesso("");
    setSalvataggio(prodotto.id);

    try {
      const nome =
        String(prodotto.nome || "").trim();

      const prezzo =
        Number(prodotto.prezzo);

      const ordine =
        Number(prodotto.ordine || 0);

      const categoryId =
        Number(prodotto.category_id);

      if (!nome) {
        throw new Error(
          "Il nome del prodotto non può essere vuoto."
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

      const { error } = await supabase
        .from("products")
        .update({
          nome,
          prezzo,
          ordine,
          category_id: categoryId,
        })
        .eq("id", prodotto.id);

      if (error) {
        throw error;
      }

      setSuccesso(
        `${nome} aggiornato correttamente.`
      );

      await caricaCatalogo();
    } catch (error) {
      console.error(error);

      setErrore(
        error.message ||
          "Errore durante il salvataggio."
      );
    } finally {
      setSalvataggio(null);
    }
  }

  async function cambiaStatoProdotto(prodotto) {
    setErrore("");
    setSuccesso("");
    setSalvataggio(prodotto.id);

    try {
      const nuovoStato =
        !prodotto.attivo;

      const { error } = await supabase
        .from("products")
        .update({
          attivo: nuovoStato,
        })
        .eq("id", prodotto.id);

      if (error) {
        throw error;
      }

      setSuccesso(
        nuovoStato
          ? `${prodotto.nome} riattivato.`
          : `${prodotto.nome} disattivato.`
      );

      await caricaCatalogo();
    } catch (error) {
      console.error(error);

      setErrore(
        "Errore durante la modifica dello stato del prodotto."
      );
    } finally {
      setSalvataggio(null);
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
            Caricamento catalogo...
          </p>
        </div>
      </main>
    );
  }

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
              AMMINISTRAZIONE
            </div>

            <h1 className="title">
              GESTIONE CATALOGO
            </h1>

            <p className="subtitle">
              Prodotti e prezzi dell'Armeria 200
            </p>
          </div>

          <button
            className="btn btn-dark"
            onClick={() =>
              router.push("/admin")
            }
          >
            ← Pannello Admin
          </button>
        </div>

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

        {/* NUOVO PRODOTTO */}

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
              NUOVO ARTICOLO
            </div>

            <h2>
              Aggiungi prodotto
            </h2>
          </div>

          <form onSubmit={creaProdotto}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "15px",
              }}
            >
              <div className="form-group">
                <label>Nome</label>

                <input
                  type="text"
                  value={
                    nuovoProdotto.nome
                  }
                  onChange={(e) =>
                    modificaNuovoProdotto(
                      "nome",
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Categoria</label>

                <select
                  value={
                    nuovoProdotto.category_id
                  }
                  onChange={(e) =>
                    modificaNuovoProdotto(
                      "category_id",
                      e.target.value
                    )
                  }
                  required
                >
                  {categorie
                    .filter(
                      (categoria) =>
                        categoria.attiva
                    )
                    .map((categoria) => (
                      <option
                        key={categoria.id}
                        value={categoria.id}
                      >
                        {categoria.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Prezzo</label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    nuovoProdotto.prezzo
                  }
                  onChange={(e) =>
                    modificaNuovoProdotto(
                      "prezzo",
                      e.target.value
                    )
                  }
                  placeholder="es. 15000"
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
                    nuovoProdotto.ordine
                  }
                  onChange={(e) =>
                    modificaNuovoProdotto(
                      "ordine",
                      e.target.value
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
                : "Aggiungi prodotto"}
            </button>
          </form>
        </div>

        {/* CATALOGO */}

        {categorie.map((categoria) => {
          const prodottiCategoria =
            prodotti.filter(
              (prodotto) =>
                Number(
                  prodotto.category_id
                ) ===
                Number(categoria.id)
            );

          return (
            <div
              key={categoria.id}
              style={{
                marginBottom: "35px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  marginBottom: "13px",
                }}
              >
                <h2
                  style={{
                    fontSize: "20px",
                    textTransform:
                      "uppercase",
                    letterSpacing: "2px",
                  }}
                >
                  {categoria.nome}
                </h2>

                <div
                  style={{
                    color: "#777",
                    fontSize: "12px",
                  }}
                >
                  {
                    prodottiCategoria.length
                  }{" "}
                  prodotti
                </div>
              </div>

              {prodottiCategoria.length ===
              0 ? (
                <div
                  className="card"
                  style={{
                    color: "#777",
                  }}
                >
                  Nessun prodotto in questa
                  categoria.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {prodottiCategoria.map(
                    (prodotto) => (
                      <div
                        className="card"
                        key={prodotto.id}
                        style={{
                          opacity:
                            prodotto.attivo
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
                            alignItems:
                              "end",
                          }}
                        >
                          <div className="form-group">
                            <label>
                              Prodotto
                            </label>

                            <input
                              value={
                                prodotto.nome
                              }
                              onChange={(e) =>
                                modificaProdottoLocale(
                                  prodotto.id,
                                  "nome",
                                  e.target
                                    .value
                                )
                              }
                            />
                          </div>

                          <div className="form-group">
                            <label>
                              Prezzo
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={
                                prodotto.prezzo
                              }
                              onChange={(e) =>
                                modificaProdottoLocale(
                                  prodotto.id,
                                  "prezzo",
                                  e.target
                                    .value
                                )
                              }
                            />
                          </div>

                          <div className="form-group">
                            <label>
                              Ordine
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={
                                prodotto.ordine
                              }
                              onChange={(e) =>
                                modificaProdottoLocale(
                                  prodotto.id,
                                  "ordine",
                                  e.target
                                    .value
                                )
                              }
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            color: "#777",
                            fontSize: "12px",
                            marginBottom:
                              "15px",
                          }}
                        >
                          Prezzo attuale:{" "}
                          <strong
                            style={{
                              color: "#fff",
                            }}
                          >
                            {formattaSoldi(
                              prodotto.prezzo
                            )}
                          </strong>

                          {!prodotto.attivo &&
                            " • PRODOTTO DISATTIVATO"}
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
                              prodotto.id
                            }
                            onClick={() =>
                              salvaProdotto(
                                prodotto
                              )
                            }
                          >
                            Salva modifiche
                          </button>

                          <button
                            className="btn btn-dark"
                            disabled={
                              salvataggio ===
                              prodotto.id
                            }
                            onClick={() =>
                              cambiaStatoProdotto(
                                prodotto
                              )
                            }
                          >
                            {prodotto.attivo
                              ? "Disattiva"
                              : "Riattiva"}
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
