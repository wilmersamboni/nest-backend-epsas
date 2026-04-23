export class EtapaPractica {
  id: string;
  matriculaId: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;
  observacion: string;
  avance: number;
  empresa?: {
    id: string;
    nombre?: string;
    nit?: string;
    direccion?: string;
    telefono?: string;
    correo?: string;
    municipio?: string;
    tipo?: string;
  };
  modalidad?: { id: string; nombre?: string };
  seguimientos?: { id: string; fecha_inicio: Date; fecha_fin: Date; observacion: string, actas_pdf: string; estado: string }[];
  bitacoras?: { id: string; fecha: Date; estado: string }[];
}