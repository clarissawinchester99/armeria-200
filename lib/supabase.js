import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yvpxzetxzedrvvwenvlt.supabase.co";

const supabaseKey =
  "sb_publishable_w5DUekCafl_4HREnPDRAhQ_nzI2-Bq8";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
