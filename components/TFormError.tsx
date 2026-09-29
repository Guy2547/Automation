"use client";

import { useTranslations } from "next-intl";
import { FormError } from "./Modal";
import { errorKeyOf } from "@/lib/errorMap";

/** FormError that auto-translates known store error strings via `errors.*`. */
export default function TFormError({ error }: { error: string | null }) {
  const tErr = useTranslations("errors");
  if (!error) return null;
  const key = errorKeyOf(error);
  let message = error;
  if (key) {
    try {
      message = tErr(key);
    } catch {
      message = error;
    }
  }
  return <FormError message={message} />;
}
