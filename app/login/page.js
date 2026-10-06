"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    setErrore("");

    const user = username.trim();

    if (!user || !password) {
      setErrore("Inserisci username e password.");
      return;
    }

    setLoading(true);

    try {
      // Recupera l'email tecnica collegata allo username
      const { data: email, error: emailError } =
        await supabase.rpc("get_login_email", {
          login_username: user,
        });

      if (emailError) {
        console.error(emailError);
        setErrore("Errore durante il controllo dell'username.");
        return;
      }

      if (!email) {
        setErrore("Username o password non corretti.");
        return;
      }

      // Login Supabase con email tecnica + password
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

      if (error || !data?.user) {
        console.error(error);
        setErrore("Username o password non corretti.");
        return;
      }

      // Controlliamo anche il profilo
      const { data: profilo, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id, username, nome, cognome, ruolo, percentuale_stipendio, attivo"
          )
          .eq("id", data.user.id)
          .single();

      if (profileError || !profilo) {
        await supabase.auth.signOut();

        setErrore("Profilo dipendente non trovato.");
        return;
      }

      if (!profilo.attivo) {
        await supabase.auth.signOut();

        setErrore("Questo account è stato disattivato.");
        return;
      }

      // Login riuscito
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(error);

      setErrore("Si è verificato un errore durante l'accesso.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "430px",
        }}
      >
        {/* LOGO / INTESTAZIONE */}

        <div
          style={{
            textAlign: "center",
            marginBottom: "35px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              letterSpacing: "5px",
              color: "#8b1e1e",
              fontWeight: "bold",
              marginBottom: "10px",
            }}
          >
            LOS SANTOS
          </div>

          <h1 className="title">
            ARMERIA 200
          </h1>

          <p className="subtitle">
            Gestionale dipendenti
          </p>
        </div>

        {/* FORM */}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              type="text"
              placeholder="Inserisci username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Inserisci password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "8px",
            }}
          >
            {loading
              ? "ACCESSO IN CORSO..."
              : "ACCEDI"}
          </button>

          {errore && (
            <div className="error-message">
              {errore}
            </div>
          )}
        </form>

        {/* FOOTER */}

        <div
          style={{
            textAlign: "center",
            marginTop: "30px",
            color: "#555",
            fontSize: "11px",
            letterSpacing: "1px",
          }}
        >
          ACCESSO RISERVATO AL PERSONALE
        </div>
      </div>
    </main>
  );
}
