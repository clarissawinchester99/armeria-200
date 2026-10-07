"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [isAdmin, setIsAdmin] = useState(false);
  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("");
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    caricaProfilo();
  }, []);

  async function caricaProfilo() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCaricamento(false);
        return;
      }

      const { data: profilo } = await supabase
        .from("profiles")
        .select(`
          nome,
          cognome,
          username,
          ruolo,
          attivo
        `)
        .eq("id", user.id)
        .single();

      if (!profilo) {
        setCaricamento(false);
        return;
      }

      setNome(
        `${profilo.nome || ""} ${
          profilo.cognome || ""
        }`.trim()
      );

      setUsername(profilo.username || "");

      setIsAdmin(
        profilo.ruolo === "admin" &&
          profilo.attivo === true
      );
    } catch (error) {
      console.error(
        "Errore caricamento Sidebar:",
        error
      );
    } finally {
      setCaricamento(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const menuPrincipale = [
    {
      nome: "Dashboard",
      percorso: "/dashboard",
      icona: "⌂",
    },
    {
      nome: "Nuova Fattura",
      percorso: "/fatture",
      icona: "$",
    },
    {
      nome: "Nuovo Import",
      percorso: "/import",
      icona: "↓",
    },
    {
      nome: "Storico Fatture",
      percorso: "/storico",
      icona: "≡",
    },
    {
      nome: "Storico Import",
      percorso: "/storico-import",
      icona: "↳",
    },
    {
      nome: "Stipendio",
      percorso: "/stipendio",
      icona: "%",
    },
  ];

  const menuAdmin = [
    {
      nome: "Pannello Admin",
      percorso: "/admin",
      icona: "★",
    },
    {
      nome: "Gestione Catalogo",
      percorso: "/admin/catalogo",
      icona: "⚙",
    },
    {
      nome: "Gestione Import",
      percorso: "/admin/import",
      icona: "↓",
    },
    {
      nome: "Storico Stipendi",
      percorso: "/storico-stipendi",
      icona: "₿",
    },
  ];

  function voceAttiva(percorso) {
    if (percorso === "/admin") {
      return pathname === "/admin";
    }

    if (percorso === "/admin/catalogo") {
      return pathname === "/admin/catalogo";
    }

    if (percorso === "/admin/import") {
      return pathname === "/admin/import";
    }

    if (percorso === "/storico-stipendi") {
      return pathname === "/storico-stipendi";
    }

    return pathname === percorso;
  }

  function MenuButton({ voce }) {
    const attiva = voceAttiva(voce.percorso);

    return (
      <button
        type="button"
        onClick={() =>
          router.push(voce.percorso)
        }
        style={{
          position: "relative",

          width: "100%",

          display: "flex",
          alignItems: "center",

          gap: "12px",

          padding: "11px 12px",

          border: attiva
            ? "1px solid rgba(217,154,43,.30)"
            : "1px solid transparent",

          borderRadius: "6px",

          background: attiva
            ? "linear-gradient(90deg, rgba(175,12,12,.30) 0%, rgba(85,5,5,.16) 65%, rgba(217,154,43,.04) 100%)"
            : "transparent",

          boxShadow: attiva
            ? "inset 3px 0 0 #d99a2b, 0 0 18px rgba(180,14,14,.08)"
            : "none",

          color: attiva
            ? "#f2c65e"
            : "#989898",

          cursor: "pointer",

          textAlign: "left",

          fontSize: "12px",

          fontWeight: attiva
            ? "900"
            : "700",

          letterSpacing: ".25px",

          transition: "all .2s ease",
        }}
      >
        <span
          style={{
            width: "27px",
            height: "27px",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            flexShrink: 0,

            borderRadius: "4px",

            background: attiva
              ? "linear-gradient(145deg, #c81913, #720707)"
              : "linear-gradient(145deg, #171717, #0c0c0c)",

            border: attiva
              ? "1px solid rgba(255,72,55,.40)"
              : "1px solid #242424",

            color: attiva
              ? "#ffd36a"
              : "#686868",

            boxShadow: attiva
              ? "0 0 12px rgba(190,15,10,.22), inset 0 1px 0 rgba(255,255,255,.10)"
              : "inset 0 1px 0 rgba(255,255,255,.02)",

            fontSize: "13px",
            fontWeight: "900",
          }}
        >
          {voce.icona}
        </span>

        <span>
          {voce.nome}
        </span>

        {attiva && (
          <span
            style={{
              position: "absolute",

              right: "10px",

              width: "4px",
              height: "4px",

              borderRadius: "50%",

              background: "#ed1c16",

              boxShadow:
                "0 0 7px #ed1c16",
            }}
          />
        )}
      </button>
    );
  }

  return (
    <aside
      style={{
        position: "fixed",

        top: 0,
        left: 0,
        bottom: 0,

        width: "250px",

        display: "flex",
        flexDirection: "column",

        background:
          "radial-gradient(circle at 50% 0%, rgba(170,15,10,.16), transparent 26%), linear-gradient(180deg, #0b0b0b 0%, #060606 45%, #030303 100%)",

        borderRight:
          "1px solid rgba(217,154,43,.18)",

        boxShadow:
          "10px 0 40px rgba(0,0,0,.65), 2px 0 12px rgba(180,14,14,.05)",

        zIndex: 1000,
      }}
    >
      {/* ======================== */}
      {/* LOGO */}
      {/* ======================== */}

      <div
        style={{
          position: "relative",

          padding: "25px 20px 22px",

          overflow: "hidden",

          borderBottom:
            "1px solid rgba(217,154,43,.15)",

          background:
            "linear-gradient(180deg, rgba(150,10,8,.10), rgba(0,0,0,0))",
        }}
      >
        <div
          style={{
            position: "absolute",

            top: 0,
            left: 0,
            right: 0,

            height: "2px",

            background:
              "linear-gradient(90deg, transparent, #a90d0d, #ed1c16, #d99a2b, transparent)",

            boxShadow:
              "0 0 12px rgba(237,28,22,.35)",
          }}
        />

        <div
          style={{
            color: "#a90d0d",

            fontSize: "9px",
            fontWeight: "900",

            letterSpacing: "4px",

            marginBottom: "6px",
          }}
        >
          GESTIONALE
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",

            gap: "7px",
          }}
        >
          <span
            style={{
              color: "#d99a2b",

           fontFamily:
  "'Trebuchet MS', Arial, Helvetica, sans-serif",

              fontSize: "27px",
              fontWeight: "900",

              letterSpacing: "2px",

              lineHeight: 1,

              textShadow:
                "0 2px 0 #5c350d, 0 0 14px rgba(217,154,43,.10)",
            }}
          >
            ARMERIA
          </span>

          <span
            style={{
              color: "#d71813",

         fontFamily:
  "'Trebuchet MS', Arial, Helvetica, sans-serif",

              fontSize: "27px",
              fontWeight: "900",

              letterSpacing: "1px",

              lineHeight: 1,

              textShadow:
                "0 2px 0 #5e0505, 0 0 14px rgba(220,20,15,.15)",
            }}
          >
            200
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",

            gap: "6px",

            marginTop: "13px",
          }}
        >
          <div
            style={{
              width: "38px",
              height: "2px",

              background:
                "linear-gradient(90deg, #a90d0d, #ed1c16)",
            }}
          />

          <div
            style={{
              width: "5px",
              height: "5px",

              transform: "rotate(45deg)",

              background: "#d99a2b",
            }}
          />

          <div
            style={{
              flex: 1,
              height: "1px",

              background:
                "linear-gradient(90deg, rgba(217,154,43,.35), transparent)",
            }}
          />
        </div>
      </div>

      {/* ======================== */}
      {/* MENU */}
      {/* ======================== */}

      <div
        style={{
          flex: 1,

          padding: "18px 13px",

          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",

            gap: "8px",

            padding: "0 10px",

            marginBottom: "9px",
          }}
        >
          <div
            style={{
              color: "#665432",

              fontSize: "8px",
              fontWeight: "900",

              letterSpacing: "3px",
            }}
          >
            MENU
          </div>

          <div
            style={{
              flex: 1,
              height: "1px",

              background:
                "linear-gradient(90deg, rgba(217,154,43,.15), transparent)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",

            gap: "4px",
          }}
        >
          {menuPrincipale.map((voce) => (
            <MenuButton
              key={voce.percorso}
              voce={voce}
            />
          ))}
        </div>

        {!caricamento && isAdmin && (
          <>
            <div
              style={{
                height: "1px",

                margin: "20px 8px",

                background:
                  "linear-gradient(90deg, transparent, rgba(180,14,14,.35), rgba(217,154,43,.20), transparent)",
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",

                gap: "8px",

                padding: "0 10px",

                marginBottom: "9px",
              }}
            >
              <div
                style={{
                  color: "#a90d0d",

                  fontSize: "8px",
                  fontWeight: "900",

                  letterSpacing: "2.5px",
                }}
              >
                AMMINISTRAZIONE
              </div>

              <div
                style={{
                  flex: 1,
                  height: "1px",

                  background:
                    "linear-gradient(90deg, rgba(180,14,14,.30), transparent)",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",

                gap: "4px",
              }}
            >
              {menuAdmin.map((voce) => (
                <MenuButton
                  key={voce.percorso}
                  voce={voce}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ======================== */}
      {/* PROFILO */}
      {/* ======================== */}

      <div
        style={{
          position: "relative",

          padding: "16px",

          borderTop:
            "1px solid rgba(217,154,43,.13)",

          background:
            "linear-gradient(180deg, rgba(0,0,0,.1), rgba(120,8,8,.05))",
        }}
      >
        {!caricamento && (
          <div
            style={{
              marginBottom: "13px",

              padding: "0 5px",
            }}
          >
            <div
              style={{
                color: "#d99a2b",

                fontSize: "11px",
                fontWeight: "900",

                letterSpacing: ".4px",

                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {nome || "Armeria 200"}
            </div>

            {username && (
              <div
                style={{
                  color: "#666",

                  fontSize: "9px",

                  marginTop: "4px",
                }}
              >
                @{username}
              </div>
            )}

            {isAdmin && (
              <div
                style={{
                  display: "inline-flex",

                  alignItems: "center",

                  gap: "5px",

                  marginTop: "7px",

                  padding: "3px 7px",

                  background:
                    "linear-gradient(90deg, rgba(160,10,10,.18), rgba(217,154,43,.05))",

                  border:
                    "1px solid rgba(217,154,43,.22)",

                  borderRadius: "3px",

                  color: "#d99a2b",

                  fontSize: "7px",
                  fontWeight: "900",

                  letterSpacing: "1.5px",
                }}
              >
                <span
                  style={{
                    width: "4px",
                    height: "4px",

                    borderRadius: "50%",

                    background: "#ed1c16",

                    boxShadow:
                      "0 0 5px #ed1c16",
                  }}
                />

                ADMIN
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          style={{
            width: "100%",

            padding: "10px 12px",

            border:
              "1px solid rgba(190,18,13,.35)",

            borderRadius: "5px",

            background:
              "linear-gradient(180deg, rgba(130,10,10,.15), rgba(65,5,5,.10))",

            color: "#b9822b",

            fontSize: "10px",
            fontWeight: "900",

            letterSpacing: ".7px",

            textTransform: "uppercase",

            cursor: "pointer",

            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,.025)",
          }}
        >
          Esci dal Gestionale
        </button>
      </div>
    </aside>
  );
}
