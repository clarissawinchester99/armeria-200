"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const MATERIALI = [
  {
    nome: "MANICO",
    prezzo: 350,
  },
  {
    nome: "LAMA",
    prezzo: 1050,
  },
  {
    nome: "ACCIAIO",
    prezzo: 105,
  },
  {
    nome: "IMPUGNATURA",
    prezzo: 700,
  },
  {
    nome: "CARICATORE",
    prezzo: 630,
  },
  {
    nome: "PEZZO ARMA",
    prezzo: 840,
  },
  {
    nome: "POLVERE DA SPARO",
    prezzo: 560,
  },
];

export default function ImportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);

  const [utente, setUtente] = useState(null);
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

      const { data: profilo, error } =
        await supabase
          .from("profiles")
          .select("attivo")
          .eq("id", user.id)
          .single();

      if (error || !profilo?.attivo) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setUtente(user);
    } catch (error) {
      console.error(error);

      setErrore(
        "Errore durante il caricamento."
      );
    } finally {
      setLoading(false);
    }
  }

  function cambiaQuantita(nome, valore) {
    let numero = parseInt(valore, 10);

    if (isNaN(numero) || numero < 0) {
      numero = 0;
    }

    setQuantita((precedenti) => ({
      ...precedenti,
      [nome]: numero,
    }));
  }

  function materialiSelezionati() {
    return MATERIALI
      .filter((materiale) => {
        return (
          Number(
            quantita[materiale.nome] || 0
          ) > 0
        );
      })
      .map((materiale) => {
        const qta = Number(
          quantita[materiale.nome] || 0
        );

        return {
          ...materiale,
          quantita: qta,
          subtotale:
            materiale.prezzo * qta,
        };
      });
  }

  function calcolaTotale() {
    return materialiSelezionati().reduce(
      (totale, materiale) =>
        totale + materiale.subtotale,
      0
    );
  }

  function formattaSoldi(numero) {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(numero || 0));
  }

  async function registraImport() {
    setErrore("");
    setSuccesso("");

    const selezionati =
      materialiSelezionati();

    if (selezionati.length === 0) {
      setErrore(
        "Inserisci almeno una quantità."
      );
      return;
    }

    const totale = calcolaTotale();

    if (totale <= 0) {
      setErrore(
        "Il totale dell'import non è valido."
      );
      return;
    }

    if (!utente) {
      setErrore(
        "Sessione non valida."
      );
      return;
    }

    setSalvataggio(true);

    try {
      // CREA IMPORT

      const {
        data: nuovoImport,
        error: importError,
      } = await supabase
        .from("imports")
        .insert({
          employee_id: utente.id,
          totale: totale,
        })
        .select()
        .single();

      if (importError) {
        throw importError;
      }

      // CREA MATERIALI DELL'IMPORT

      const righe = selezionati.map(
        (materiale) => ({
          import_id: nuovoImport.id,
          materiale: materiale.nome,
          prezzo_unitario:
            materiale.prezzo,
          quantita:
            materiale.quantita,
          subtotale:
            materiale.subtotale,
        })
      );

      const { error: righeError } =
        await supabase
          .from("import_items")
          .insert(righe);

      if (righeError) {
        // Evitiamo di lasciare
        // un import incompleto.
        await supabase
          .from("imports")
          .delete()
          .eq("id", nuovoImport.id);

        throw righeError;
      }

      setSuccesso(
        "Import registrato correttamente."
      );

      setQuantita({});

      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    } catch (error) {
      console.error(error);

      setErrore(
        "Errore durante la registrazione dell'import."
      );
    } finally {
      setSalvataggio(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <div>
          Caricamento import...
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
              ARMERIA 200
            </div>

            <h1 className="title">
              NUOVO IMPORT
            </h1>

            <p className="subtitle">
              Registra un ordine di materiali
              per l'Armeria.
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

        {/* MATERIALI */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "15px",
          }}
        >
          {MATERIALI.map((materiale) => {
            const qta = Number(
              quantita[materiale.nome] || 0
            );

            const subtotale =
              materiale.prezzo * qta;

            return (
              <div
                className="card"
                key={materiale.nome}
                style={{
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
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
                        fontSize: "17px",
                      }}
                    >
                      {materiale.nome}
                    </h3>

                    <div
                      style={{
                        color: "#777",
                        fontSize: "12px",
                        marginTop: "5px",
                      }}
                    >
                      Prezzo unitario
                    </div>
                  </div>

                  <div
                    style={{
                      color: "#c42a2a",
                      fontSize: "18px",
                      fontWeight: "900",
                    }}
                  >
                    {formattaSoldi(
                      materiale.prezzo
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
                      materiale.nome,
                      e.target.value
                    )
                  }
                  style={{
                    marginTop: "8px",
                  }}
                />

                {qta > 0 && (
                  <div
                    style={{
                      marginTop: "15px",
                      paddingTop: "15px",
                      borderTop:
                        "1px solid #222",
                      display: "flex",
                      justifyContent:
                        "space-between",
                      color: "#aaa",
                      fontSize: "13px",
                    }}
                  >
                    <span>
                      Subtotale
                    </span>

                    <strong
                      style={{
                        color: "#fff",
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
          })}
        </div>

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
                Totale Import
              </div>

              <div
                style={{
                  fontSize: "34px",
                  fontWeight: "900",
                  marginTop: "5px",
                }}
              >
                {formattaSoldi(totale)}
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={registraImport}
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
                : "REGISTRA IMPORT"}
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
