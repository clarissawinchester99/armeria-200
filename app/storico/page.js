"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";

export default function StoricoPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profilo, setProfilo] = useState(null);
  const [fatture, setFatture] = useState([]);
  const [errore, setErrore] = useState("");

  const [fatturaAperta, setFatturaAperta] =
    useState(null);

  useEffect(() => {
    caricaStorico();
  }, []);

  async function caricaStorico() {
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
      // PROFILO UTENTE
      // ==============================

      const {
        data: profiloData,
        error: profiloError,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profiloError || !profiloData) {
        throw (
          profiloError ||
          new Error("Profilo non trovato")
        );
      }

      if (!profiloData.attivo) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setProfilo(profiloData);

      // ==============================
      // CARICA FATTURE
      // ==============================

      const {
        data: fattureData,
        error: fattureError,
      } = await supabase
        .from("invoices")
        .select(`
          id,
          totale,
          annullata,
          created_at,
          employee_id,
          employee_nome,
          employee_cognome,
          employee_username,
          employee_grado,
          profiles (
            nome,
            cognome,
            username,
            grado
          ),
          invoice_items (
            id,
            nome_prodotto,
            prezzo_unitario,
            quantita,
            subtotale
          )
        `)
        .order("created_at", {
          ascending: false,
        });

      if (fattureError) {
        throw fattureError;
      }

      setFatture(
        fattureData || []
      );
    } catch (error) {
      console.error(
        "Errore storico:",
        error
      );

      setErrore(
        error.message ||
          "Errore durante il caricamento dello storico."
      );
    } finally {
      setLoading(false);
    }
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
  // FORMATTA DATA
  // ==============================

  function formattaData(data) {
    return new Intl.DateTimeFormat(
      "it-IT",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(
      new Date(data)
    );
  }

  // ==============================
  // NOME DIPENDENTE
  // ==============================

  function nomeDipendente(fattura) {
    const profiloDipendente =
      fattura.profiles;

    const nomeProfilo =
      `${
        profiloDipendente?.nome ||
        ""
      } ${
        profiloDipendente?.cognome ||
        ""
      }`.trim();

    if (nomeProfilo) {
      return nomeProfilo;
    }

    const nomeStorico =
      `${
        fattura.employee_nome ||
        ""
      } ${
        fattura.employee_cognome ||
        ""
      }`.trim();

    if (nomeStorico) {
      return nomeStorico;
    }

    return (
      profiloDipendente?.username ||
      fattura.employee_username ||
      "Dipendente eliminato"
    );
  }

  // ==============================
  // USERNAME DIPENDENTE
  // ==============================

  function usernameDipendente(
    fattura
  ) {
    return (
      fattura.profiles?.username ||
      fattura.employee_username ||
      ""
    );
  }

  // ==============================
  // GRADO DIPENDENTE
  // ==============================

  function gradoDipendente(
    fattura
  ) {
    return (
      fattura.profiles?.grado ||
      fattura.employee_grado ||
      ""
    );
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
            <h2>
              ARMERIA 200
            </h2>

            <p
              style={{
                color: "#777",
                marginTop: "10px",
              }}
            >
              Caricamento storico...
            </p>
          </div>
        </main>
      </>
    );
  }

  // ==============================
  // TOTALI
  // ==============================

  const admin =
    profilo?.ruolo === "admin";

  const fattureValide =
    fatture.filter(
      (fattura) =>
        !fattura.annullata
    );

  const totaleStorico =
    fattureValide.reduce(
      (totale, fattura) =>
        totale +
        Number(
          fattura.totale || 0
        ),
      0
    );

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
              STORICO FATTURE
            </h1>

            <p className="subtitle">
              {admin
                ? "Visualizzazione fatture di tutti i dipendenti"
                : "Le tue fatture registrate"}
            </p>
          </div>

          {/* RIEPILOGO */}

          <div
            style={{
              display: "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",

              gap: "15px",

              marginBottom: "30px",
            }}
          >
            <div className="card">
              <div
                style={{
                  color: "#777",
                  fontSize: "11px",
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "1.5px",
                }}
              >
                Fatture valide
              </div>

              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "800",
                  marginTop: "8px",
                }}
              >
                {
                  fattureValide.length
                }
              </div>
            </div>

            <div className="card">
              <div
                style={{
                  color: "#777",
                  fontSize: "11px",
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "1.5px",
                }}
              >
                Fatturato
              </div>

              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "800",
                  marginTop: "8px",
                }}
              >
                {formattaSoldi(
                  totaleStorico
                )}
              </div>
            </div>
          </div>

          {/* ERRORE */}

          {errore && (
            <div
              className="error-message"
              style={{
                marginBottom:
                  "20px",
              }}
            >
              {errore}
            </div>
          )}

          {/* FATTURE */}

          {fatture.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign:
                  "center",

                color: "#777",
              }}
            >
              Nessuna fattura
              registrata.
            </div>
          ) : (
            <div
              style={{
                display: "flex",

                flexDirection:
                  "column",

                gap: "12px",
              }}
            >
              {fatture.map(
                (fattura) => {
                  const aperta =
                    fatturaAperta ===
                    fattura.id;

                  const username =
                    usernameDipendente(
                      fattura
                    );

                  const grado =
                    gradoDipendente(
                      fattura
                    );

                  const dipendenteEliminato =
                    !fattura.employee_id;

                  return (
                    <div
                      className="card"
                      key={fattura.id}
                      style={{
                        padding:
                          "20px",

                        opacity:
                          fattura.annullata
                            ? 0.55
                            : 1,

                        border:
                          fattura.annullata
                            ? "1px solid rgba(196,42,42,.35)"
                            : undefined,
                      }}
                    >
                      {/* TESTATA */}

                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          alignItems:
                            "center",

                          gap: "20px",

                          flexWrap:
                            "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize:
                                "17px",

                              fontWeight:
                                "800",
                            }}
                          >
                            {formattaSoldi(
                              fattura.totale
                            )}
                          </div>

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
                            {formattaData(
                              fattura.created_at
                            )}

                            {admin && (
                              <>
                                {" • "}

                                {nomeDipendente(
                                  fattura
                                )}
                              </>
                            )}
                          </div>

                          {/* DATI DIPENDENTE */}

                          {admin &&
                            username && (
                              <div
                                style={{
                                  color:
                                    "#777",

                                  fontSize:
                                    "11px",

                                  marginTop:
                                    "5px",
                                }}
                              >
                                @{username}
                              </div>
                            )}

                          {admin &&
                            grado && (
                              <div
                                style={{
                                  color:
                                    "#777",

                                  fontSize:
                                    "11px",

                                  marginTop:
                                    "3px",
                                }}
                              >
                                {grado}
                              </div>
                            )}

                          {/* ACCOUNT ELIMINATO */}

                          {admin &&
                            dipendenteEliminato && (
                              <div
                                style={{
                                  color:
                                    "#c42a2a",

                                  fontSize:
                                    "10px",

                                  fontWeight:
                                    "900",

                                  marginTop:
                                    "6px",

                                  letterSpacing:
                                    "1px",
                                }}
                              >
                                ACCOUNT ELIMINATO
                              </div>
                            )}

                          {/* FATTURA ANNULLATA */}

                          {fattura.annullata && (
                            <div
                              style={{
                                color:
                                  "#d34b4b",

                                fontSize:
                                  "11px",

                                fontWeight:
                                  "bold",

                                marginTop:
                                  "7px",

                                letterSpacing:
                                  "1px",
                              }}
                            >
                              FATTURA ANNULLATA
                            </div>
                          )}
                        </div>

                        <button
                          className="btn btn-dark"
                          onClick={() =>
                            setFatturaAperta(
                              aperta
                                ? null
                                : fattura.id
                            )
                          }
                        >
                          {aperta
                            ? "Chiudi"
                            : "Dettagli"}
                        </button>
                      </div>

                      {/* DETTAGLI */}

                      {aperta && (
                        <div
                          style={{
                            marginTop:
                              "20px",

                            paddingTop:
                              "20px",

                            borderTop:
                              "1px solid #252525",
                          }}
                        >
                          {fattura
                            .invoice_items
                            ?.length >
                          0 ? (
                            fattura.invoice_items.map(
                              (item) => (
                                <div
                                  key={
                                    item.id
                                  }
                                  style={{
                                    display:
                                      "grid",

                                    gridTemplateColumns:
                                      "1fr auto",

                                    gap:
                                      "15px",

                                    padding:
                                      "10px 0",

                                    borderBottom:
                                      "1px solid #1e1e1e",
                                  }}
                                >
                                  <div>
                                    <strong>
                                      {
                                        item.nome_prodotto
                                      }
                                    </strong>

                                    <div
                                      style={{
                                        color:
                                          "#777",

                                        fontSize:
                                          "12px",

                                        marginTop:
                                          "4px",
                                      }}
                                    >
                                      {formattaSoldi(
                                        item.prezzo_unitario
                                      )}{" "}
                                      ×{" "}
                                      {
                                        item.quantita
                                      }
                                    </div>
                                  </div>

                                  <strong>
                                    {formattaSoldi(
                                      item.subtotale
                                    )}
                                  </strong>
                                </div>
                              )
                            )
                          ) : (
                            <div
                              style={{
                                color:
                                  "#777",
                              }}
                            >
                              Nessun dettaglio
                              disponibile.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
