"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";

export default function FatturePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);

  const [utente, setUtente] = useState(null);
  const [profilo, setProfilo] = useState(null);

  const [categorie, setCategorie] = useState([]);
  const [prodotti, setProdotti] = useState([]);
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

      setUtente(user);

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
          grado,
          attivo
        `)
        .eq("id", user.id)
        .single();

      if (profiloError || !profiloData) {
        throw new Error(
          "Impossibile caricare il profilo del dipendente."
        );
      }

      if (!profiloData.attivo) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setProfilo(profiloData);

      const {
        data: categorieData,
        error: categorieError,
      } = await supabase
        .from("categories")
        .select("*")
        .eq("attiva", true)
        .order("ordine", {
          ascending: true,
        });

      if (categorieError) {
        throw categorieError;
      }

      const {
        data: prodottiData,
        error: prodottiError,
      } = await supabase
        .from("products")
        .select("*")
        .eq("attivo", true)
        .order("ordine", {
          ascending: true,
        })
        .order("nome", {
          ascending: true,
        });

      if (prodottiError) {
        throw prodottiError;
      }

      setCategorie(categorieData || []);
      setProdotti(prodottiData || []);
    } catch (error) {
      console.error(error);

      setErrore(
        error.message ||
          "Errore durante il caricamento dei prodotti."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // QUANTITÀ
  // ==============================

  function cambiaQuantita(productId, valore) {
    let numero = parseInt(valore, 10);

    if (isNaN(numero) || numero < 0) {
      numero = 0;
    }

    setQuantita((precedenti) => ({
      ...precedenti,
      [productId]: numero,
    }));

    if (successo) {
      setSuccesso("");
    }
  }

  // ==============================
  // PRODOTTI SELEZIONATI
  // ==============================

  function prodottiSelezionati() {
    return prodotti
      .filter(
        (prodotto) =>
          Number(quantita[prodotto.id] || 0) > 0
      )
      .map((prodotto) => {
        const qta = Number(
          quantita[prodotto.id] || 0
        );

        return {
          ...prodotto,
          quantita: qta,
          subtotale:
            Number(prodotto.prezzo) * qta,
        };
      });
  }

  function calcolaTotale() {
    return prodottiSelezionati().reduce(
      (totale, prodotto) =>
        totale + prodotto.subtotale,
      0
    );
  }

  function formattaSoldi(numero) {
    return `$${new Intl.NumberFormat("it-IT", {
      maximumFractionDigits: 2,
    }).format(Number(numero || 0))}`;
  }

  // ==============================
  // CREA FATTURA
  // ==============================

  async function creaFattura() {
    if (salvataggio) return;

    setErrore("");
    setSuccesso("");

    const selezionati = prodottiSelezionati();

    if (selezionati.length === 0) {
      setErrore("Seleziona almeno un prodotto.");
      return;
    }

    const totale = calcolaTotale();

    if (totale <= 0) {
      setErrore(
        "Il totale della fattura non è valido."
      );
      return;
    }

    if (!utente || !profilo) {
      setErrore(
        "Utente non valido. Effettua nuovamente il login."
      );
      return;
    }

    setSalvataggio(true);

    try {
      const {
        data: fattura,
        error: fatturaError,
      } = await supabase
        .from("invoices")
        .insert({
          employee_id: utente.id,
          employee_nome: profilo.nome || "",
          employee_cognome: profilo.cognome || "",
          employee_username: profilo.username || "",
          employee_grado:
            profilo.grado || "Dipendente",
          totale: totale,
        })
        .select()
        .single();

      if (fatturaError) {
        throw fatturaError;
      }

      const righe = selezion
