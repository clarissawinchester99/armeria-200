import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl =
  "https://yvpxzetxzedrvvwenvlt.supabase.co";

const supabasePublishableKey =
  "sb_publishable_w5DUekCafl_4HREnPDRAhQ_nzI2-Bq8";

export async function POST(request) {
  try {
    // Legge il token dell'utente che sta facendo la richiesta
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Non autorizzato." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Client normale: serve per verificare chi sta facendo la richiesta
    const userClient = createClient(
      supabaseUrl,
      supabasePublishableKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Sessione non valida." },
        { status: 401 }
      );
    }

    // Controlla che chi sta facendo la richiesta sia davvero admin
    const { data: profiloAdmin, error: adminError } =
      await userClient
        .from("profiles")
        .select("ruolo, attivo")
        .eq("id", user.id)
        .single();

    if (
      adminError ||
      !profiloAdmin ||
      profiloAdmin.ruolo !== "admin" ||
      !profiloAdmin.attivo
    ) {
      return NextResponse.json(
        { error: "Accesso riservato agli amministratori." },
        { status: 403 }
      );
    }

    // Legge i dati del nuovo dipendente
    const body = await request.json();

    const nome = String(body.nome || "").trim();
    const cognome = String(body.cognome || "").trim();
    const username = String(body.username || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");

    const percentuale = Number(
      body.percentuale_stipendio || 0
    );

    // Controlli
    if (!nome || !cognome || !username || !password) {
      return NextResponse.json(
        {
          error:
            "Nome, cognome, username e password sono obbligatori.",
        },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9._-]+$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Lo username può contenere solo lettere, numeri, punto, trattino e underscore.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error:
            "La password deve contenere almeno 6 caratteri.",
        },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(percentuale) ||
      percentuale < 0 ||
      percentuale > 100
    ) {
      return NextResponse.json(
        {
          error:
            "La percentuale stipendio deve essere compresa tra 0 e 100.",
        },
        { status: 400 }
      );
    }

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Configurazione server mancante.",
        },
        { status: 500 }
      );
    }

    // Client amministrativo SOLO lato server
    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Controlla username già esistente
    const { data: usernameEsistente } =
      await adminClient
        .from("profiles")
        .select("id")
        .ilike("username", username)
        .maybeSingle();

    if (usernameEsistente) {
      return NextResponse.json(
        {
          error: "Questo username è già utilizzato.",
        },
        { status: 409 }
      );
    }

    /*
     * Supabase Auth richiede un'email.
     * La generiamo internamente.
     * Il dipendente NON dovrà usarla:
     * entrerà nel sito con username + password.
     */
    const emailTecnica =
      `${username}@armeria200.local`;

    // Crea l'utente Auth
    const {
      data: nuovoUtente,
      error: createError,
    } = await adminClient.auth.admin.createUser({
      email: emailTecnica,
      password,
      email_confirm: true,

      user_metadata: {
        nome,
        cognome,
      },
    });

    if (createError) {
      return NextResponse.json(
        {
          error:
            createError.message ||
            "Errore durante la creazione dell'utente.",
        },
        { status: 400 }
      );
    }

    const userId = nuovoUtente.user.id;

    /*
     * Il trigger che abbiamo creato in Supabase
     * genera automaticamente il profilo.
     * Ora lo completiamo.
     */
    const { error: profileError } =
      await adminClient
        .from("profiles")
        .update({
          nome,
          cognome,
          username,
          ruolo: "dipendente",
          percentuale_stipendio: percentuale,
          attivo: true,
        })
        .eq("id", userId);

    if (profileError) {
      // Se qualcosa va storto eliminiamo anche l'utente Auth
      // per non lasciare account incompleti.
      await adminClient.auth.admin.deleteUser(userId);

      return NextResponse.json(
        {
          error:
            "Errore durante la creazione del profilo dipendente.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Dipendente creato correttamente.",
      user: {
        id: userId,
        nome,
        cognome,
        username,
        percentuale_stipendio: percentuale,
      },
    });
  } catch (error) {
    console.error("CREATE USER ERROR:", error);

    return NextResponse.json(
      {
        error:
          "Errore interno durante la creazione del dipendente.",
      },
      { status: 500 }
    );
  }
}
