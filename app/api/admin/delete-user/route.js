import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl =
  "https://yvpxzetxzedrvvwenvlt.supabase.co";

const supabaseKey =
  "sb_publishable_w5DUekCafl_4HREnPDRAhQ_nzI2-Bq8";

export async function POST(request) {
  try {
    // ==============================
    // TOKEN ADMIN
    // ==============================

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error:
            "Sessione amministratore non valida.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization
        .replace("Bearer ", "")
        .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Sessione amministratore non valida.",
        },
        {
          status: 401,
        }
      );
    }

    // ==============================
    // CLIENT PER VERIFICA TOKEN
    // ==============================

    const supabaseAuth = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user: adminUser },
      error: userError,
    } =
      await supabaseAuth.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !adminUser
    ) {
      console.error(
        "Errore verifica token admin:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "Sessione amministratore non valida.",
        },
        {
          status: 401,
        }
      );
    }

    // ==============================
    // SERVICE ROLE
    // ==============================

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error(
        "SUPABASE_SERVICE_ROLE_KEY non configurata."
      );

      return NextResponse.json(
        {
          error:
            "Configurazione server incompleta.",
        },
        {
          status: 500,
        }
      );
    }

    // Questo client rimane SOLO sul server.
    // Bypassa la RLS e viene usato dopo
    // aver verificato il token Auth.

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    // ==============================
    // CONTROLLO PROFILO ADMIN
    // ==============================

    const {
      data: profiloAdmin,
      error: profiloAdminError,
    } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, ruolo, attivo"
      )
      .eq("id", adminUser.id)
      .single();

    if (profiloAdminError) {
      console.error(
        "Errore lettura profilo admin:",
        profiloAdminError
      );

      return NextResponse.json(
        {
          error:
            "Impossibile verificare i permessi amministratore.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !profiloAdmin ||
      profiloAdmin.ruolo !==
        "admin" ||
      !profiloAdmin.attivo
    ) {
      return NextResponse.json(
        {
          error:
            "Non sei autorizzato a eliminare dipendenti.",
        },
        {
          status: 403,
        }
      );
    }

    // ==============================
    // DATI RICHIESTA
    // ==============================

    const body =
      await request.json();

    const userId =
      body?.user_id;

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Dipendente non specificato.",
        },
        {
          status: 400,
        }
      );
    }

    // ==============================
    // BLOCCA AUTO-ELIMINAZIONE
    // ==============================

    if (
      userId === adminUser.id
    ) {
      return NextResponse.json(
        {
          error:
            "Non puoi eliminare il tuo account amministratore.",
        },
        {
          status: 400,
        }
      );
    }

    // ==============================
    // CERCA DIPENDENTE
    // ==============================

    const {
      data: dipendente,
      error: dipendenteError,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        nome,
        cognome,
        username,
        ruolo
      `)
      .eq("id", userId)
      .single();

    if (
      dipendenteError ||
      !dipendente
    ) {
      console.error(
        "Errore ricerca dipendente:",
        dipendenteError
      );

      return NextResponse.json(
        {
          error:
            "Dipendente non trovato.",
        },
        {
          status: 404,
        }
      );
    }

    // ==============================
    // PROTEZIONE ACCOUNT ADMIN
    // ==============================

    if (
      dipendente.ruolo ===
      "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Non puoi eliminare un account amministratore.",
        },
        {
          status: 403,
        }
      );
    }

    // ==============================
    // ELIMINA UTENTE AUTH
    // ==============================
    //
    // Eliminando auth.users:
    //
    // auth.users
    //      ↓ ON DELETE CASCADE
    // profiles
    //
    // invoices/imports:
    //
    // employee_id
    //      ↓ ON DELETE SET NULL
    //
    // quindi fatture e import
    // rimangono nello storico.
    //
    // I dati storici del dipendente
    // sono già salvati nei campi:
    //
    // employee_nome
    // employee_cognome
    // employee_username
    // employee_grado
    // ==============================

    const {
      error: deleteError,
    } =
      await supabaseAdmin
        .auth
        .admin
        .deleteUser(userId);

    if (deleteError) {
      console.error(
        "Errore eliminazione Auth:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            deleteError.message ||
            "Errore durante l'eliminazione del dipendente.",
        },
        {
          status: 500,
        }
      );
    }

    // ==============================
    // RISPOSTA
    // ==============================

    return NextResponse.json({
      success: true,

      message:
        "Dipendente eliminato definitivamente.",

      dipendente: {
        nome:
          dipendente.nome || "",

        cognome:
          dipendente.cognome || "",

        username:
          dipendente.username || "",
      },
    });
  } catch (error) {
    console.error(
      "Errore API eliminazione dipendente:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Errore interno del server.",
      },
      {
        status: 500,
      }
    );
  }
}
