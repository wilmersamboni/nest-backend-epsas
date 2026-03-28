const h = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');

const pAprendiz = Buffer.from('{"sub":"550e8400-e29b-41d4-a716-446655440000","cargo":"aprendiz"}').toString('base64url');

const pDocente = Buffer.from('{"sub":"11111111-1111-1111-1111-111111111111","cargo":"instructor"}').toString('base64url');

console.log('APRENDIZ:');
console.log(h + '.' + pAprendiz + '.firma-falsa');
console.log('');
console.log('DOCENTE:');
console.log(h + '.' + pDocente + '.firma-falsa');