"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function StoricoImportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profilo, setProfilo] = useState(null);
  const [imports, setImports] = useState([]);
  const [aperto, setAperto] = useState(null);
  const [azione, setAzione] = useState(null);
  const [errore, setErrore] = useState("");

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

      // ==============================
      // PROFILO UTENTE
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
          ruolo,
          attivo
        `)
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
      // CARICA IMPORT
      // ==============================
      //
      // La RLS decide automaticamente:
      // dipendente = propri import
      // admin = tutti gli import
      //
      // Carichiamo anche i dati storici
      // del dipendente salvati direttamente
      // nell'import.
      // ==============================

      const {
        data: importData,
        error: importError,
      } = await supabase
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

      if (importError) {
        throw importError;
      }

      const listaImport =
        importData || [];

      // ==============================
      // CARICA DIPENDENTI ESISTENTI
      // ==============================
      //
      // Se il dipendente esiste ancora,
      // usiamo anche il suo profilo attuale.
      //
      // Se è stato eliminato, useremo
      // invece i dati storici salvati
      // direttamente nell'import.
      // ==============================

      const employeeIds = [
        ...new Set(
          listaImport
            .map(
              (ordine) =>
                ordine.employee_id
            )
            .filter(Boolean)
        ),
      ];

      let profiliMap = {};

      if (employeeIds.length > 0) {
        const {
          data: profiliData,
          error: profiliError,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            nome,
            cognome,
            username,
            grado
          `)
          .in("id", employeeIds);

        if (profiliError) {
          throw profiliError;
        }

        profiliMap =
          Object.fromEntries(
            (profiliData || []).map(
              (dipendente) => [
                dipendente.id,
                dipendente,
              ]
            )
          );
      }

      // ==============================
      // CARICA RIGHE IMPORT
      // ==============================

      const importIds =
        listaImport.map(
          (ordine) => ordine.id
        );

      let righeImport = [];

      if (importIds.length > 0) {
        const {
          data: righeData,
          error: righeError,
        } = await supabase
          .from("import_items")
          .select(`
            id,
            import_id,
            materiale,
            prezzo_unitario,
            quantita,
            subtotale
          `)
          .in("import_id", importIds)
          .order("id", {
            ascending: true,
          });

        if (righeError) {
          throw righeError;
        }

        righeImport =
          righeData || [];
      }

      // ==============================
      // UNISCE TUTTO
      // ==============================

      const completi =
        listaImport.map(
          (ordine) => ({
            ...ordine,

            dipendente:
              ordine.employee_id
                ? profiliMap[
                    ordine.employee_id
                  ] || null
                : null,

            materiali:
              righeImport.filter(
                (riga) =>
                  riga.import_id ===
                  ordine.id
              ),
          })
        );

      setImports(completi);
    } catch (error) {
      console.error(
        "Errore caricamento storico import:",
        error
      );

      setErrore(
        error.message ||
          "Errore durante il caricamento dello storico import."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // FORMATTA SOLDI
  // ==============================

  function formattaSoldi(numero) {
    return new Intl.NumberFormat(
      "it-IT",
      {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }
    ).format(
      Number(numero || 0)
    );
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
    ).format(new Date(data));
  }

  // ==============================
  // NOME DIPENDENTE
  // ==============================
  //
  // 1. Se il profilo esiste ancora,
  //    usa i dati attuali.
  //
  // 2. Se il profilo è stato eliminato,
  //    usa i dati storici dell'import.
  //
  // 3. Ultimo fallback:
  //    "Dipendente eliminato".
  // ==============================

  function nomeDipendente(ordine) {
    const nomeProfilo =
      `${
        ordine.dipendente?.nome ||
        ""
      } ${
        ordine.dipendente
          ?.cognome || ""
      }`.trim();

    if (nomeProfilo) {
      return nomeProfilo;
    }

    const nomeStorico =
      `${
        ordine.employee_nome ||
        ""
      } ${
        ordine.employee_cognome ||
        ""
      }`.trim();

    if (nomeStorico) {
      return nomeStorico;
    }

    return (
      ordine.dipendente
        ?.username ||
      ordine.employee_username ||
      "Dipendente eliminato"
    );
  }

  // ==============================
  // USERNAME DIPENDENTE
  // ==============================

  function usernameDipendente(
    ordine
  ) {
    return (
      ordine.dipendente
        ?.username ||
      ordine.employee_username ||
      ""
    );
  }

  // ==============================
  // GRADO DIPENDENTE
  // ==============================

  function gradoDipendente(
    ordine
  ) {
    return (
      ordine.dipendente?.grado ||
      ordine.employee_grado ||
      ""
    );
  }

  // ==============================
  // ANNULLA / RIPRISTINA IMPORT
  // ==============================

  async function cambiaStatoImport(
    ordine
  ) {
    if (
      profilo?.ruolo !== "admin"
    ) {
      return;
    }

    setErrore("");
    setAzione(ordine.id);

    try {
      const funzione =
        ordine.annullato
          ? "ripristina_import"
          : "annulla_import";

      const { error } =
        await supabase.rpc(
          funzione,
          {
            import_id:
              ordine.id,
          }
        );

      if (error) {
        throw error;
      }

      await caricaPagina();
    } catch (error) {
      console.error(
        "Errore modifica import:",
        error
      );

      setErrore(
        "Non è stato possibile modificare lo stato dell'import."
      );
    } finally {
      setAzione(null);
    }
  }

  // ==============================
  // TOTALI
  // ==============================

  const admin =
    profilo?.ruolo === "admin";

  const importValidi =
    imports.filter(
      (ordine) =>
        !ordine.annullato
    );

  const totaleImport =
    importValidi.reduce(
      (totale, ordine) =>
        totale +
        Number(
          ordine.totale || 0
        ),
      0
    );

  // ==============================
  // LOADING
  // ==============================

  if (loading) {
    return (
      <main className="page">
        <div>
          <h2>
            ARMERIA 200
          </h2>

          <p
            style={{
              color: "#777",
              marginTop: "10px",
            }}
          >
            Caricamento storico
            import...
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
              STORICO IMPORT
            </h1>

            <p className="subtitle">
              Ordini dei materiali
              dell'Armeria
            </p>
          </div>

          <button
            className="btn btn-dark"
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
          >
            ← Dashboard
          </button>
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
          <StatCard
            titolo={
              admin
                ? "Import registrati"
                : "I tuoi import"
            }
            valore={
              importValidi.length
            }
          />

          <StatCard
            titolo="Totale Import"
            valore={formattaSoldi(
              totaleImport
            )}
          />
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

        {/* NESSUN IMPORT */}

        {imports.length === 0 && (
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "45px 20px",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                fontWeight: "900",
                marginBottom: "10px",
              }}
            >
              Nessun import
              registrato
            </div>

            <div
              style={{
                color: "#777",
                fontSize: "13px",
                marginBottom: "20px",
              }}
            >
              Gli ordini dei materiali
              compariranno qui.
            </div>

            <button
              className="btn btn-primary"
              onClick={() =>
                router.push(
                  "/import"
                )
              }
            >
              Nuovo Import
            </button>
          </div>
        )}

        {/* LISTA IMPORT */}

        <div
          style={{
            display: "grid",
            gap: "15px",
          }}
        >
          {imports.map(
            (ordine) => {
              const dettagliAperti =
                aperto === ordine.id;

              const username =
                usernameDipendente(
                  ordine
                );

              const grado =
                gradoDipendente(
                  ordine
                );

              const dipendenteEliminato =
                !ordine.employee_id;

              return (
                <div
                  className="card"
                  key={ordine.id}
                  style={{
                    opacity:
                      ordine.annullato
                        ? 0.55
                        : 1,

                    border:
                      ordine.annullato
                        ? "1px solid rgba(196,42,42,.35)"
                        : undefined,
                  }}
                >
                  {/* TESTATA IMPORT */}

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
                          color:
                            "#777",

                          fontSize:
                            "11px",

                          textTransform:
                            "uppercase",

                          letterSpacing:
                            "1.5px",

                          marginBottom:
                            "7px",
                        }}
                      >
                        {formattaData(
                          ordine.created_at
                        )}
                      </div>

                      <div
                        style={{
                          fontSize:
                            "19px",

                          fontWeight:
                            "900",
                        }}
                      >
                        {nomeDipendente(
                          ordine
                        )}
                      </div>

                      {admin &&
                        username && (
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
                                "12px",

                              marginTop:
                                "3px",
                            }}
                          >
                            {grado}
                          </div>
                        )}

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

                      {ordine.annullato && (
                        <div
                          style={{
                            color:
                              "#e64b4b",

                            fontSize:
                              "11px",

                            fontWeight:
                              "900",

                            marginTop:
                              "8px",

                            letterSpacing:
                              "1px",
                          }}
                        >
                          IMPORT ANNULLATO
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        textAlign:
                          "right",
                      }}
                    >
                      <div
                        style={{
                          color:
                            "#777",

                          fontSize:
                            "10px",

                          textTransform:
                            "uppercase",

                          letterSpacing:
                            "1px",
                        }}
                      >
                        Totale
                      </div>

                      <div
                        style={{
                          fontSize:
                            "26px",

                          fontWeight:
                            "900",

                          color:
                            ordine.annullato
                              ? "#777"
                              : "#fff",
                        }}
                      >
                        {formattaSoldi(
                          ordine.totale
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PULSANTI */}

                  <div
                    style={{
                      display:
                        "flex",

                      gap: "10px",

                      flexWrap:
                        "wrap",

                      marginTop:
                        "20px",
                    }}
                  >
                    <button
                      className="btn btn-dark"
                      onClick={() =>
                        setAperto(
                          dettagliAperti
                            ? null
                            : ordine.id
                        )
                      }
                    >
                      {dettagliAperti
                        ? "Nascondi dettagli"
                        : "Vedi dettagli"}
                    </button>

                    {admin && (
                      <button
                        className={
                          ordine.annullato
                            ? "btn btn-dark"
                            : "btn btn-primary"
                        }
                        disabled={
                          azione ===
                          ordine.id
                        }
                        onClick={() =>
                          cambiaStatoImport(
                            ordine
                          )
                        }
                      >
                        {azione ===
                        ordine.id
                          ? "ATTENDI..."
                          : ordine.annullato
                          ? "Ripristina Import"
                          : "Annulla Import"}
                      </button>
                    )}
                  </div>

                  {/* DETTAGLI */}

                  {dettagliAperti && (
                    <div
                      style={{
                        marginTop:
                          "25px",

                        paddingTop:
                          "20px",

                        borderTop:
                          "1px solid #222",
                      }}
                    >
                      <div
                        style={{
                          color:
                            "#777",

                          fontSize:
                            "11px",

                          textTransform:
                            "uppercase",

                          letterSpacing:
                            "1.5px",

                          marginBottom:
                            "15px",
                        }}
                      >
                        Materiali ordinati
                      </div>

                      <div
                        style={{
                          display:
                            "grid",

                          gap: "10px",
                        }}
                      >
                        {ordine.materiali.map(
                          (
                            materiale
                          ) => (
                            <div
                              key={
                                materiale.id
                              }
                              style={{
                                display:
                                  "grid",

                                gridTemplateColumns:
                                  "minmax(120px, 1fr) auto auto",

                                gap: "20px",

                                alignItems:
                                  "center",

                                padding:
                                  "12px 0",

                                borderBottom:
                                  "1px solid #1c1c1c",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontWeight:
                                      "800",
                                  }}
                                >
                                  {
                                    materiale.materiale
                                  }
                                </div>

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
                                  {formattaSoldi(
                                    materiale.prezzo_unitario
                                  )}{" "}
                                  cad.
                                </div>
                              </div>

                              <div
                                style={{
                                  color:
                                    "#aaa",

                                  fontSize:
                                    "13px",
                                }}
                              >
                                ×{" "}
                                {
                                  materiale.quantita
                                }
                              </div>

                              <div
                                style={{
                                  fontWeight:
                                    "900",

                                  textAlign:
                                    "right",
                                }}
                              >
                                {formattaSoldi(
                                  materiale.subtotale
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          alignItems:
                            "center",

                          gap: "20px",

                          marginTop:
                            "20px",

                          paddingTop:
                            "15px",
                        }}
                      >
                        <strong>
                          TOTALE ORDINE
                        </strong>

                        <strong
                          style={{
                            fontSize:
                              "22px",

                            color:
                              "#c42a2a",
                          }}
                        >
                          {formattaSoldi(
                            ordine.totale
                          )}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({
  titolo,
  valore,
}) {
  return (
    <div className="card">
      <div
        style={{
          color: "#777",
          fontSize: "11px",
          textTransform:
            "uppercase",
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
