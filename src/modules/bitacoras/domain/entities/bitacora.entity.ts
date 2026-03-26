export class Bitacora {
  id: string;
  fecha: Date;
  bitacora_pdf: string;
  estado: string;
  seguimiento?: { id: string };
}