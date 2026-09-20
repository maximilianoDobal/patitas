import { turnoWasCancelled, turnoWasReprogrammed } from "@/lib/email/turnoEmailChanges";
import { enviarEmailTransaccionalTurno } from "@/lib/email/turnoEmails";
import { TURNO_EMAIL_TIPO } from "@/lib/email/turnoEmailTypes";
import {
  borrarRecordatorioPendiente,
  listTurnosEnVentanaRecordatorio,
} from "@/lib/repos/turnoEmails";

function logTurnoEmailError(label, err) {
  console.error(`[email turno] ${label}:`, err?.message || err);
}

export async function notifyTurnoCreated(turno) {
  try {
    await enviarEmailTransaccionalTurno(turno.id, TURNO_EMAIL_TIPO.AGENDADO);
  } catch (err) {
    logTurnoEmailError("agendado", err);
  }
}

export async function notifyTurnoUpdated({ before, after }) {
  try {
    if (turnoWasCancelled(before, { estado: after.estado })) {
      await enviarEmailTransaccionalTurno(after.id, TURNO_EMAIL_TIPO.CANCELADO);
      return;
    }

    if (turnoWasReprogrammed(before, after)) {
      await borrarRecordatorioPendiente(after.id);
      await enviarEmailTransaccionalTurno(after.id, TURNO_EMAIL_TIPO.REPROGRAMADO);
    }
  } catch (err) {
    logTurnoEmailError("actualización", err);
  }
}

export async function dispatchRecordatoriosTurno() {
  const ids = await listTurnosEnVentanaRecordatorio();
  const results = { processed: ids.length, sent: 0, skipped: 0, errors: 0 };

  for (const turnoId of ids) {
    try {
      const r = await enviarEmailTransaccionalTurno(turnoId, TURNO_EMAIL_TIPO.RECORDATORIO_24H);
      if (r.skipped) results.skipped += 1;
      else if (r.sent !== false) results.sent += 1;
    } catch {
      results.errors += 1;
    }
  }

  return results;
}
