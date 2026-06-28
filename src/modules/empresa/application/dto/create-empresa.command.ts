export interface CreateEmpresaCommand {
  nit: string;
  nombre: string;
  direccion: string;
  telefono: string;
  correo: string;
  municipio: string;
  estado?: string;
  longitud?: number;
  latitud?: number;
  tipo: string;
}
