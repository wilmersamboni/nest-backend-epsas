/**
 * Seed de datos de prueba para EPSAS.
 *
 * Conecta directamente a DB_NAME del .env, sin pasar por el middleware
 * de tenant (no necesita ERP corriendo, no aplica RLS).
 *
 * Uso:
 *   npm run seed
 *
 * Los UUIDs marcados como "ERP" son ficticios.
 * Reemplázalos por los reales de tu instancia antes de probar con JWT.
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';

import { ConfiguracionPractica }  from '../modules/configuracion/configuracion.entity';
import { ModalidadOrmEntity }     from '../modules/modalidad/infrastructure/entities/modalidad.orm-entity';
import { EmpresaOrmEntity }       from '../modules/empresa/infrastructure/entities/empresa.orm-entity';
import { EtapaPracticaOrmEntity } from '../modules/etapa_practica/infrastructure/entities/etapa_practica.orm-entity';
import { AsignacionOrmEntity }    from '../modules/asignaciones/infrastructure/entities/asignacion.orm-entity';
import { SeguimientoOrmEntity }   from '../modules/seguimientos/infrastructure/entities/seguimiento.orm-entity';
import { BitacoraOrmEntity }      from '../modules/bitacoras/infrastructure/entities/bitacora.orm-entity';
import { ObservacionOrmEntity }   from '../modules/observaciones/infrastructure/entities/observacion.orm-entity';
import { FormatoOrmEntity }       from '../modules/formatos/infrastructure/entities/formato.orm-entity';
import { DocumentoOrmEntity }     from '../modules/documentos-practica/infrastructure/entities/documento-practica.orm-entity';

// ── UUIDs externos (ERP) ─────────────────────────────────────────────────────
// Reemplaza estos valores por los reales de tu instancia del ERP.
// Son los que el JWT incluye y que el middleware mapea a x-centro-id.
const CENTRO_ID    = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const SEDE_ID      = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const MATRICULA_1  = 'cccccccc-cccc-4ccc-cccc-cccccccccccc'; // aprendiz 1
const MATRICULA_2  = 'dddddddd-dddd-4ddd-dddd-dddddddddddd'; // aprendiz 2
const INSTRUCTOR_1 = 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee'; // texto libre (ID persona ERP)
const INSTRUCTOR_2 = 'ffffffff-ffff-4fff-ffff-ffffffffffff';

// ─────────────────────────────────────────────────────────────────────────────

const ALL_ENTITIES = [
  ConfiguracionPractica,
  ModalidadOrmEntity,
  EmpresaOrmEntity,
  EtapaPracticaOrmEntity,
  AsignacionOrmEntity,
  SeguimientoOrmEntity,
  BitacoraOrmEntity,
  ObservacionOrmEntity,
  FormatoOrmEntity,
  DocumentoOrmEntity,
];

async function seed(): Promise<void> {
  const ds = new DataSource({
    type: 'postgres',
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     parseInt(process.env.DB_PORT  ?? '5432'),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME     ?? 'backend-nest-epsas',
    entities:  ALL_ENTITIES,
    synchronize: false,
    logging: false,
  });

  await ds.initialize();
  console.log(`\n🔌 Conectado a: ${process.env.DB_NAME ?? 'backend-nest-epsas'}\n`);

  try {
    // ── 1. ConfiguracionPractica ──────────────────────────────────────────────
    // Fila única (id = 1). save() hace upsert por PK.
    await ds.getRepository(ConfiguracionPractica).save({ id: 1, min_avance: 70 });
    console.log('✔  ConfiguracionPractica  min_avance=70');

    // ── 2. Modalidades ────────────────────────────────────────────────────────
    const modalRepo = ds.getRepository(ModalidadOrmEntity);
    const [mod1, mod2, mod3] = await modalRepo.save([
      { centroId: CENTRO_ID, sedeId: SEDE_ID, nombre: 'Contrato de Aprendizaje' },
      { centroId: CENTRO_ID, sedeId: SEDE_ID, nombre: 'Pasantía' },
      { centroId: CENTRO_ID, sedeId: SEDE_ID, nombre: 'Proyecto Productivo' },
    ]);
    console.log(`✔  Modalidades            (3): ${mod1.id.slice(0,8)}... ${mod2.id.slice(0,8)}... ${mod3.id.slice(0,8)}...`);

    // ── 3. Empresas ───────────────────────────────────────────────────────────
    const empRepo = ds.getRepository(EmpresaOrmEntity);
    const empresas: EmpresaOrmEntity[] = await (empRepo.save as any)([
      {
        centroId: CENTRO_ID, sedeId: SEDE_ID,
        nit: 900111222, nombre: 'Empresa Alpha S.A.S.',
        direccion: 'Calle 10 # 5-20', telefono: '6088100001',
        correo: 'alpha@empresa.com', municipio: 'Neiva',
        estado: 'activo', tipo: 'privada',
        longitud: null, latitud: null,
      },
      {
        centroId: CENTRO_ID, sedeId: SEDE_ID,
        nit: 900333444, nombre: 'Empresa Beta Ltda.',
        direccion: 'Carrera 8 # 12-30', telefono: '6088200002',
        correo: 'beta@empresa.com', municipio: 'Pitalito',
        estado: 'activo', tipo: 'publica',
        longitud: null, latitud: null,
      },
    ]);
    const [emp1, emp2] = empresas;
    console.log(`✔  Empresas               (2): ${emp1.id.slice(0,8)}... ${emp2.id.slice(0,8)}...`);

    // ── 4. Etapas Práctica ────────────────────────────────────────────────────
    const etapaRepo = ds.getRepository(EtapaPracticaOrmEntity);
    const [etapa1, etapa2] = await etapaRepo.save([
      {
        centroId: CENTRO_ID, sedeId: SEDE_ID,
        matriculaId: MATRICULA_1,
        fecha_inicio: new Date('2026-01-15'),
        fecha_fin:    new Date('2026-07-15'),
        estado: 'en_progreso',
        observacion: 'Primera etapa de prueba',
        avance: 40,
        empresa:   { id: emp1.id },
        modalidad: { id: mod1.id },
      },
      {
        centroId: CENTRO_ID, sedeId: SEDE_ID,
        matriculaId: MATRICULA_2,
        fecha_inicio: new Date('2026-02-01'),
        fecha_fin:    new Date('2026-08-01'),
        estado: 'en_progreso',
        observacion: 'Segunda etapa de prueba',
        avance: 20,
        empresa:   { id: emp2.id },
        modalidad: { id: mod2.id },
      },
    ]);
    console.log(`✔  EtapaPractica          (2): ${etapa1.id.slice(0,8)}... ${etapa2.id.slice(0,8)}...`);

    // ── 5. Asignaciones ───────────────────────────────────────────────────────
    const asigRepo = ds.getRepository(AsignacionOrmEntity);
    const [asig1, asig2] = await asigRepo.save([
      {
        centroId: CENTRO_ID, sedeId: SEDE_ID,
        instructor: INSTRUCTOR_1,
        fecha_inicio: new Date('2026-01-15'),
        fecha_fin:    new Date('2026-07-15'),
        estado: 'activo', horas: 880,
        etapa: { id: etapa1.id },
      },
      {
        centroId: CENTRO_ID, sedeId: SEDE_ID,
        instructor: INSTRUCTOR_2,
        fecha_inicio: new Date('2026-02-01'),
        fecha_fin:    new Date('2026-08-01'),
        estado: 'activo', horas: 880,
        etapa: { id: etapa2.id },
      },
    ]);
    console.log(`✔  Asignaciones           (2): ${asig1.id.slice(0,8)}... ${asig2.id.slice(0,8)}...`);

    // ── 6. Seguimientos ───────────────────────────────────────────────────────
    const segRepo = ds.getRepository(SeguimientoOrmEntity);
    const seguimientos: SeguimientoOrmEntity[] = await (segRepo.save as any)([
      {
        centroId: CENTRO_ID, sedeId: SEDE_ID,
        estado: 'pendiente',
        observacion: 'Primera visita programada',
        fecha_inicio: new Date('2026-03-01'),
        fecha_fin:    new Date('2026-03-05'),
        etapa:      { id: etapa1.id },
        asignacion: { id: asig1.id },
      },
      {
        centroId: CENTRO_ID, sedeId: SEDE_ID,
        estado: 'realizado',
        observacion: 'Seguimiento completado sin novedad',
        fecha_inicio: new Date('2026-04-10'),
        fecha_fin:    new Date('2026-04-12'),
        etapa:      { id: etapa2.id },
        asignacion: { id: asig2.id },
      },
    ]);
    const [seg1, seg2] = seguimientos;
    console.log(`✔  Seguimientos           (2): ${seg1.id.slice(0,8)}... ${seg2.id.slice(0,8)}...`);

    // ── 7. Bitácoras ──────────────────────────────────────────────────────────
    await ds.getRepository(BitacoraOrmEntity).save([
      {
        centroId: CENTRO_ID, sedeId: SEDE_ID,
        fecha: new Date('2026-03-10'),
        bitacora_pdf: 'uploads/bitacoras/bitacora_seed_1.pdf',
        estado: 'aprobado',
        seguimiento: { id: seg1.id },
      },
      {
        centroId: CENTRO_ID, sedeId: SEDE_ID,
        fecha: new Date('2026-04-15'),
        bitacora_pdf: 'uploads/bitacoras/bitacora_seed_2.pdf',
        estado: 'pendiente',
        seguimiento: { id: seg2.id },
      },
    ]);
    console.log('✔  Bitácoras              (2)');

    // ── 8. Observaciones ──────────────────────────────────────────────────────
    await ds.getRepository(ObservacionOrmEntity).save([
      {
        centroId: CENTRO_ID, sedeId: SEDE_ID,
        fecha: new Date('2026-03-10'),
        descripcion: 'El aprendiz presenta buen desempeño técnico.',
        evidencia_foto: 'uploads/observaciones/obs_seed_1.jpg',
        persona: INSTRUCTOR_1,
        seguimiento: { id: seg1.id },
      },
      {
        centroId: CENTRO_ID, sedeId: SEDE_ID,
        fecha: new Date('2026-04-15'),
        descripcion: 'Se requiere mejorar la puntualidad.',
        evidencia_foto: 'uploads/observaciones/obs_seed_2.jpg',
        persona: INSTRUCTOR_2,
        seguimiento: { id: seg2.id },
      },
    ]);
    console.log('✔  Observaciones          (2)');

    // ── 9. Formatos (plantillas globales — sin etapa) ─────────────────────────
    await ds.getRepository(FormatoOrmEntity).save([
      {
        centroId: CENTRO_ID, sedeId: SEDE_ID,
        tipo: 'contrato',
        nombre: 'Contrato Aprendizaje 2026',
        ruta_archivo:    'uploads/formatos/contrato_2026.pdf',
        nombre_original: 'contrato_aprendizaje_2026.pdf',
        mime_type: 'application/pdf', tamanio: 204800,
        estado: 'activo', subido_por: null,
        etapa: null,
      },
      {
        centroId: CENTRO_ID, sedeId: SEDE_ID,
        tipo: 'carta_presentacion',
        nombre: 'Carta de Presentación',
        ruta_archivo:    'uploads/formatos/carta_presentacion.pdf',
        nombre_original: 'carta_presentacion.pdf',
        mime_type: 'application/pdf', tamanio: 102400,
        estado: 'activo', subido_por: null,
        etapa: null,
      },
    ]);
    console.log('✔  Formatos               (2)  [plantillas globales, sin etapa]');

    // ── 10. Documentos ────────────────────────────────────────────────────────
    // etapaId es columna UUID directa (no FK TypeORM manejada) — se pasa explícito.
    await ds.getRepository(DocumentoOrmEntity).save([
      {
        etapaId:         etapa1.id,
        nombre_original: 'contrato_firmado.pdf',
        nombre_archivo:  'contrato_firmado_seed.pdf',
        ruta:            'uploads/documentos/contrato_firmado_seed.pdf',
        tipo_mime:       'application/pdf',
        tamanio:         307200,
        etapa:           { id: etapa1.id },
      },
      {
        etapaId:         etapa2.id,
        nombre_original: 'certificado_arl.pdf',
        nombre_archivo:  'certificado_arl_seed.pdf',
        ruta:            'uploads/documentos/certificado_arl_seed.pdf',
        tipo_mime:       'application/pdf',
        tamanio:         153600,
        etapa:           { id: etapa2.id },
      },
    ]);
    console.log('✔  Documentos             (2)');

    // ── Resumen ───────────────────────────────────────────────────────────────
    console.log(`
✅ Seed completado exitosamente.

   UUIDs externos usados (ficticios — reemplaza con los reales del ERP):
   ┌──────────────┬────────────────────────────────────────┐
   │ CENTRO_ID    │ ${CENTRO_ID} │
   │ SEDE_ID      │ ${SEDE_ID} │
   │ MATRICULA_1  │ ${MATRICULA_1} │
   │ MATRICULA_2  │ ${MATRICULA_2} │
   │ INSTRUCTOR_1 │ ${INSTRUCTOR_1} │
   │ INSTRUCTOR_2 │ ${INSTRUCTOR_2} │
   └──────────────┴────────────────────────────────────────┘

   Para probar con Postman/curl, envía estos headers:
     x-tenant: <slug_del_tenant>
     x-centro-id: ${CENTRO_ID}
     x-cargo: administrador
     Authorization: Bearer <jwt_del_erp>
`);

  } finally {
    await ds.destroy();
  }
}

seed().catch((err) => {
  console.error('\n❌ Seed fallido:', err.message ?? err);
  process.exit(1);
});
