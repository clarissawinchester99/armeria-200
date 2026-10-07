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
          width: "100%",

          display: "flex",
          alignItems: "center",

          gap: "11px",

          padding: "11px 12px",

          border: "none",
          borderRadius: "8px",

          background: attiva
            ? "rgba(125, 22, 22, 0.28)"
            : "transparent",

          color: attiva
            ? "#ffffff"
            : "#9a9a9a",

          cursor: "pointer",

          textAlign: "left",

          fontSize: "13px",

          fontWeight: attiva
            ? "800"
            : "600",

          transition: "0.2s",
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

            borderRadius: "6px",

            background: attiva
              ? "#7d1616"
              : "#171717",

            border: attiva
              ? "1px solid #8b1e1e"
              : "1px solid #252525",

            color: attiva
              ? "#ffffff"
              : "#777777",

            fontSize: "13px",
            fontWeight: "800",
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

        display: "flex",
        flexDirection: "column",

        background:
          "linear-gradient(180deg, #111111 0%, #090909 100%)",

        borderRight:
          "1px solid rgba(255,255,255,0.07)",

        boxShadow:
          "8px 0 30px rgba(0,0,0,0.35)",

        zIndex: 1000,
      }}
    >
      {/* LOGO */}

      <div
        style={{
          padding: "24px 20px",

          borderBottom:
            "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          style={{
            color: "#777777",

            fontSize: "9px",
            fontWeight: "800",

            letterSpacing: "3px",

            marginBottom: "6px",
          }}
        >
          GESTIONALE
        </div>

        <div
          style={{
            color: "#ffffff",

            fontSize: "23px",
            fontWeight: "900",

            letterSpacing: "1px",
          }}
        >
          ARMERIA{" "}
          <span
            style={{
              color: "#8b1e1e",
            }}
          >
            200
          </span>
        </div>
      </div>

      {/* MENU */}

      <div
        style={{
          flex: 1,

          padding: "18px 13px",

          overflowY: "auto",
        }}
      >
        <div
          style={{
            color: "#555555",

            fontSize: "9px",
            fontWeight: "800",

            letterSpacing: "2px",

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
                  "rgba(255,255,255,0.06)",
              }}
            />

            <div
              style={{
                color: "#7d1616",

                fontSize: "9px",
                fontWeight: "800",

                letterSpacing: "2px",

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

      {/* PROFILO */}

      <div
        style={{
          padding: "16px",

          borderTop:
            "1px solid rgba(255,255,255,0.07)",

          background: "#0a0a0a",
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
                color: "#ffffff",

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
                  color: "#666666",

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
                  display: "inline-flex",

                  alignItems: "center",

                  marginTop: "7px",

                  padding: "3px 7px",

                  background:
                    "rgba(125,22,22,0.14)",

                  border:
                    "1px solid rgba(139,30,30,0.25)",

                  borderRadius: "5px",

                  color: "#b95c5c",

                  fontSize: "8px",
                  fontWeight: "800",

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

            padding: "10px 12px",

            border:
              "1px solid #292929",

            borderRadius: "7px",

            background: "#151515",

            color: "#b5b5b5",

            fontSize: "11px",
            fontWeight: "700",

            cursor: "pointer",
          }}
        >
          Esci dal Gestionale
        </button>
      </div>
    </aside>
  );
}
