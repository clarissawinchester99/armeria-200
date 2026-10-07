"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";

export default function StoricoStipendiPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState("");
  const [pagamenti, setPagamenti] = useState([]);

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

      const { data, error } = await supabase
        .from("storico_stipendi")
        .select(`
          id,
          employee_id,
          employee_nome,
          employee_cognome,
          employee_username,
          employee_grado,
          percentuale_stipendio,
          fatturato_periodo,
          stipendio_pagato,
          periodo_da,
          periodo_a,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setPagamenti(data || []);
    } catch (error) {
      console.error(
        "Errore caricamento storico stipendi:",
        error
      );

      setErrore(
        error?.message ||
          "Errore durante il caricamento dello storico stipendi."
      );
    } finally {
      setLoading(false);
    }
  }

  function formattaSoldi(numero) {
    return `$${new Intl.NumberFormat("it-IT", {
      maximumFractionDigits: 2,
    }).format(Number(numero || 0))}`;
  }

  function formattaData(data) {
    if (!data) {
      return "Inizio attività";
    }

    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(data));
  }

  const totaleStipendiPagati = pagamenti.reduce(
    (totale, pagamento) =>
      totale +
      Number(pagamento.stipendio_pagato || 0),
    0
  );

  const totaleFatturatoPagato = pagamenti.reduce(
    (totale, pagamento) =>
      totale +
      Number(pagamento.fatturato_periodo || 0),
    0
  );

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
              Caricamento storico stipendi...
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
              STORICO STIPENDI
            </h1>

            <p className="subtitle">
              Registro dei pagamenti effettuati al
              personale
            </p>
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

          {/* TOTALI */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "15px",
              marginBottom: "35px",
            }}
          >
            <StatCard
              titolo="Pagamenti effettuati"
              valore={pagamenti.length}
            />

            <StatCard
              titolo="Fatturato liquidato"
              valore={formattaSoldi(
                totaleFatturatoPagato
              )}
            />

            <StatCard
              titolo="Stipendi pagati"
              valore={formattaSoldi(
                totaleStipendiPagati
              )}
            />
          </div>

          {/* STORICO */}

          {pagamenti.length === 0 ? (
            <div className="card">
              <div
                style={{
                  color: "#c42a2a",
                  fontSize: "11px",
                  fontWeight: "900",
                  letterSpacing: "2px",
                  marginBottom: "10px",
                }}
              >
                STORICO
              </div>

              <h2>Nessun pagamento registrato</h2>

              <p
                style={{
                  color: "#777",
                  marginTop: "8px",
                  fontSize: "13px",
                }}
              >
                Quando pagherai il primo stipendio di
                sabato, comparirà automaticamente qui.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              {pagamenti.map((pagamento) => {
                const nomeCompleto =
                  `${pagamento.employee_nome || ""} ${
                    pagamento.employee_cognome || ""
                  }`.trim() ||
                  pagamento.employee_username ||
                  "Dipendente eliminato";

                const accountEliminato =
                  !pagamento.employee_id;

                return (
                  <div
                    className="card"
                    key={pagamento.id}
                    style={{
                      border:
                        "1px solid rgba(139,30,30,.35)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "flex-start",
                        gap: "25px",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* DIPENDENTE */}

                      <div
                        style={{
                          minWidth: "220px",
                          flex: "1",
                        }}
                      >
                        <div
                          style={{
                            color: "#c42a2a",
                            fontSize: "10px",
                            fontWeight: "900",
                            letterSpacing: "2px",
                            marginBottom: "7px",
                          }}
                        >
                          STIPENDIO PAGATO
                        </div>

                        <div
                          style={{
                            fontSize: "20px",
                            fontWeight: "900",
                          }}
                        >
                          {nomeCompleto}
                        </div>

                        {pagamento.employee_username && (
                          <div
                            style={{
                              color: "#777",
                              fontSize: "12px",
                              marginTop: "4px",
                            }}
                          >
                            @
                            {
                              pagamento.employee_username
                            }
                          </div>
                        )}

                        <div
                          style={{
                            color: "#aaa",
                            fontSize: "12px",
                            marginTop: "8px",
                          }}
                        >
                          {pagamento.employee_grado ||
                            "Grado non disponibile"}
                          {" • "}
                          {
                            pagamento.percentuale_stipendio
                          }
                          %
                        </div>

                        {accountEliminato && (
                          <div
                            style={{
                              color: "#c42a2a",
                              fontSize: "10px",
                              fontWeight: "900",
                              letterSpacing: "1px",
                              marginTop: "8px",
                            }}
                          >
                            ACCOUNT ELIMINATO
                          </div>
                        )}
                      </div>

                      {/* PERIODO */}

                      <div
                        style={{
                          minWidth: "220px",
                          flex: "1",
                        }}
                      >
                        <div
                          style={{
                            color: "#777",
                            fontSize: "10px",
                            textTransform:
                              "uppercase",
                            letterSpacing: "1.5px",
                            marginBottom: "7px",
                          }}
                        >
                          Periodo pagato
                        </div>

                        <div
                          style={{
                            color: "#ddd",
                            fontSize: "13px",
                            lineHeight: "1.7",
                          }}
                        >
                          <div>
                            Da:{" "}
                            <strong>
                              {formattaData(
                                pagamento.periodo_da
                              )}
                            </strong>
                          </div>

                          <div>
                            A:{" "}
                            <strong>
                              {formattaData(
                                pagamento.periodo_a
                              )}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* IMPORTI */}

                      <div
                        style={{
                          minWidth: "220px",
                          textAlign: "right",
                        }}
                      >
                        <div
                          style={{
                            color: "#777",
                            fontSize: "11px",
                            marginBottom: "5px",
                          }}
                        >
                          Fatturato del periodo
                        </div>

                        <div
                          style={{
                            fontSize: "16px",
                            fontWeight: "800",
                            marginBottom: "12px",
                          }}
                        >
                          {formattaSoldi(
                            pagamento.fatturato_periodo
                          )}
                        </div>

                        <div
                          style={{
                            color: "#777",
                            fontSize: "11px",
                            marginBottom: "5px",
                          }}
                        >
                          Stipendio pagato
                        </div>

                        <div
                          style={{
                            color: "#c42a2a",
                            fontSize: "26px",
                            fontWeight: "900",
                          }}
                        >
                          {formattaSoldi(
                            pagamento.stipendio_pagato
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        borderTop:
                          "1px solid rgba(255,255,255,.06)",
                        marginTop: "18px",
                        paddingTop: "12px",
                        color: "#666",
                        fontSize: "11px",
                      }}
                    >
                      Pagamento registrato il{" "}
                      {formattaData(
                        pagamento.created_at
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
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
