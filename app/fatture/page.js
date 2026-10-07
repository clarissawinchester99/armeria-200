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

      // ==============================
      // CARICA PROFILO DIPENDENTE
      // ==============================

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

      // ==============================
      // CARICA CATEGORIE
      // ==============================

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

      // ==============================
      // CARICA PRODOTTI
      // ==============================

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
