export class Usuario {
  constructor({ id, nombre, email, telefono, rol }) {
    this.id = id;
    this.nombre = nombre;
    this.email = email;
    this.telefono = telefono;
    this.rol = rol;
  }
}

export class Recepcionista extends Usuario {
  constructor(props) {
    super({ ...props, rol: "recepcionista" });
  }

  puedeGestionarTurnos() {
    return true;
  }

  puedeRegistrarClientes() {
    return true;
  }
}

export class Veterinario extends Usuario {
  constructor({ matricula, especialidadProfesional, ...rest }) {
    super({ ...rest, rol: "veterinario" });
    this.matricula = matricula;
    this.especialidadProfesional = especialidadProfesional ?? null;
  }

  puedeAtenderTurno(turno) {
    return turno.veterinarioId === this.id;
  }
}

export function buildUsuarioFromRecord(record) {
  if (record.rol === "veterinario") {
    return new Veterinario(record);
  }
  if (record.rol === "recepcionista") {
    return new Recepcionista(record);
  }
  return new Usuario(record);
}
