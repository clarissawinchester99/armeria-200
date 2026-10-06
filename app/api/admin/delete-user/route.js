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
      authorization.replace("Bearer ", "");

    // ==============================
    // CLIENT PUBBLICO
    // ==============================

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    const {
      data: { user: adminUser },
      error: userError,
    } = await supabase.auth.getUser(
      accessToken
    );

    if (
      userError ||
      !adminUser
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

    // ==============================
    // CONTROLLO CHE SIA ADMIN
    // ==============================

    const {
      data: profiloAdmin,
      error: profiloAdminError,
    } = await supabase
      .from("profiles")
      .select("id, ruolo, attivo")
      .eq("id", adminUser.id)
      .single();

    if (
      profiloAdminError ||
      !profiloAdmin ||
      profiloAdmin.ruolo !== "admin" ||
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
    // DIPENDENTE DA ELIMINARE
    // ==============================

    const body = await request.json();

    const userId = body.user_id;

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

    // IMPEDISCE ALL'ADMIN DI ELIMINARE SE STESSO

    if (userId === adminUser.id) {
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
    // SERVICE ROLE
    // ==============================

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    const supabaseAdmin = createClient(
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
    // CONTROLLA IL DIPENDENTE
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

    // NON PERMETTIAMO DI ELIMINARE ALTRI ADMIN

    if (dipendente.ruolo === "admin") {
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
    // profiles.id ha ON DELETE CASCADE
    // verso auth.users.
    //
    // Eliminando l'utente Auth:
    //
    // auth.users
    //      ↓
    // profiles
    //
    // viene eliminato automaticamente.
    //
    // Le fatture e gli import invece
    // rimangono perché abbiamo impostato:
    //
    // ON DELETE SET NULL
    //

    const {
      error: deleteError,
    } =
      await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

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
          error.message ||
          "Errore interno del server.",
      },
      {
        status: 500,
      }
    );
  }
}
