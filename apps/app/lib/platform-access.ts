import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";

/**
 * Fail closed. Platform operators are explicitly provisioned by deployment,
 * independently of workspace membership or workspace administrator status.
 */
export async function requirePlatformOperator() {
  const session = await requireSession();
  const allowed = (process.env.PLATFORM_OPERATOR_EMAILS ?? "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0 || !allowed.includes(session.user.email.toLowerCase())) {
    notFound();
  }
  return session;
}
