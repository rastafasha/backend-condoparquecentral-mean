const { execSync } = require('child_process');

const scripts = [
    'usuarioSeeder.js',
    'residenciasSeeder.js',
    'oficinasSeeder.js',
    'localesSeeder.js',
    'profileSeeder.js',      // <--- Importante: Después de usuarios y propiedades
    'facturacionSeeder.js',
    'paymentsSeeder.js',
    'transferenciasSeeder.js',
    'comunicadosData.js'
];

console.log('🚀 Iniciando RECONSTRUCCIÓN TOTAL de la base de datos...');

scripts.forEach(script => {
    try {
        console.log(`\n--- Ejecutando: ${script} ---`);
        // Ejecuta el script y muestra la salida en consola
        execSync(`node seeders/${script}`, { stdio: 'inherit' });
    } catch (error) {
        console.error(`❌ Error en ${script}:`, error.message);
        process.exit(1); // Detiene todo si uno falla
    }
});

console.log('\n✨ ¡BASE DE DATOS RECONSTRUIDA CON ÉXITO! ✨');
