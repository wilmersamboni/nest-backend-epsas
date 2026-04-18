export class EtapaPractica {
  id: string;
  matriculaId: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  estado: string;
  observacion: string;
  avance: number;
  empresa?: { id: string };
  modalidad?: { id: string };
}