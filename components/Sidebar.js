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
  ];

  function voceAttiva(percorso) {
    if (percorso === "/admin") {
      return pathname === "/admin";
    }

    if (percorso === "/admin/catalogo") {
      return pathname === "/admin/catalogo";
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
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "13px",

          padding: "13px 14px",

          border: attiva
            ? "1px solid rgba(196,42,42,.55)"
            : "1px solid transparent",

          borderRadius: "8px",

          background: attiva
            ? "rgba(139,30,30,.18)"
            : "transparent",

          color: attiva
            ? "#ffffff"
            : "#9b9b9b",

          cursor: "pointer",

          textAlign: "left",

          fontSize: "13px",
          fontWeight: attiva
            ? "800"
            : "600",

          transition: "all .2s ease",
        }}
      >
        <span
          style={{
            width: "24px",
            height: "24px",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            borderRadius: "5px",

            background: attiva
              ? "#8b1e1e"
              : "rgba(255,255,255,.04)",

            color: attiva
              ? "#fff"
              : "#777",

            fontSize: "14px",
            fontWeight: "900",

            flexShrink: 0,
          }}
        >
          {voce.icona}
        </span>

        <span>{voce.nome}</span>
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

        background:
          "linear-gradient(180deg, #0d0d0d 0%, #080808 100%)",

        borderRight:
          "1px solid rgba(139,30,30,.28)",

        display: "flex",
        flexDirection: "column",

        zIndex: 1000,

        boxShadow:
          "8px 0 30px rgba(0,0,0,.25)",
      }}
    >
      {/* LOGO */}

      <div
        style={{
          padding: "28px 22px 24px",

          borderBottom:
            "1px solid rgba(255,255,255,.05)",
        }}
      >
        <div
          style={{
            color: "#c42a2a",

            fontSize: "10px",
            fontWeight: "900",

            letterSpacing: "4px",

            marginBottom: "7px",
          }}
        >
          GESTIONALE
        </div>

        <div
          style={{
            color: "#ffffff",

            fontSize: "23px",
            fontWeight: "900",

            letterSpacing: "2px",
          }}
        >
          ARMERIA 200
        </div>

        <div
          style={{
            width: "45px",
            height: "2px",

            background: "#8b1e1e",

            marginTop: "13px",
          }}
        />
      </div>

      {/* MENU */}

      <div
        style={{
          flex: 1,

          padding: "20px 14px",

          overflowY: "auto",
        }}
      >
        <div
          style={{
            color: "#555",

            fontSize: "9px",
            fontWeight: "900",

            letterSpacing: "2.5px",

            padding: "0 10px",

            marginBottom: "9px",
          }}
        >
          MENU
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
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

                background:
                  "rgba(255,255,255,.05)",

                margin: "22px 8px",
              }}
            />

            <div
              style={{
                color: "#8b1e1e",

                fontSize: "9px",
                fontWeight: "900",

                letterSpacing: "2.5px",

                padding: "0 10px",

                marginBottom: "9px",
              }}
            >
              AMMINISTRAZIONE
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
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

      {/* PROFILO */}

      <div
        style={{
          padding: "18px",

          borderTop:
            "1px solid rgba(255,255,255,.05)",
        }}
      >
        {!caricamento && (
          <div
            style={{
              marginBottom: "15px",
              padding: "0 5px",
            }}
          >
            <div
              style={{
                color: "#fff",

                fontSize: "12px",
                fontWeight: "800",

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

                  fontSize: "10px",

                  marginTop: "4px",
                }}
              >
                @{username}
              </div>
            )}

            {isAdmin && (
              <div
                style={{
                  display: "inline-block",

                  marginTop: "7px",

                  padding: "3px 7px",

                  background:
                    "rgba(139,30,30,.18)",

                  border:
                    "1px solid rgba(196,42,42,.25)",

                  borderRadius: "4px",

                  color: "#c42a2a",

                  fontSize: "8px",
                  fontWeight: "900",

                  letterSpacing: "1px",
                }}
              >
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

            padding: "11px 12px",

            border:
              "1px solid rgba(196,42,42,.25)",

            borderRadius: "7px",

            background:
              "rgba(139,30,30,.08)",

            color: "#c42a2a",

            fontSize: "11px",
            fontWeight: "800",

            cursor: "pointer",
          }}
        >
          Esci dal Gestionale
        </button>
      </div>
    </aside>
  );
}
