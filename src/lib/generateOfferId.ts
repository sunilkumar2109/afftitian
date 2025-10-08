/**
 * Generates a unique offer ID like OFF86176
 */
export function generateOfferId(): string {
  const randomNum = Math.floor(Math.random() * 900000) + 100000; // 6 digit number
  return `OFF${randomNum}`;
}

/**
 * Check if offer_id already exists in database
 */
import { supabase } from "@/integrations/supabase/client";

export async function generateUniqueOfferId(): Promise<string> {
  let offerId = generateOfferId();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from("offers")
      .select("offer_id")
      .eq("offer_id", offerId)
      .single();

    // If no match found, this ID is unique
    if (error || !data) {
      return offerId;
    }

    // Generate new ID and try again
    offerId = generateOfferId();
    attempts++;
  }

  // Fallback with timestamp if too many collisions
  return `OFF${Date.now().toString().slice(-6)}`;
}