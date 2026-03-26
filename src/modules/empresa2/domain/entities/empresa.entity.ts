export class Empresa {
  constructor(
    public id: string,
    public nit: string,
    public nombre: string,
    public direccion: string,
    public telefono: string,
    public correo: string,
    public municipio: string,
    public estado: string,
    public longitud?: number,
    public latitud?: number,
    public tipo?: string,
  ) {}
}