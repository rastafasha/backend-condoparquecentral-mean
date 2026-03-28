const mongoose = require('mongoose');
require('dotenv').config();
const Residencia = require('../models/residencia');

const residenciasData = [
    {
        edificio: 'Catuche',
        piso: 1,
        letra:'L',
        montoMensual: 500
    },
    {
        edificio: 'Tajamar',
        piso: 1,
        letra:'L',
        montoMensual: 500
    },
    {
        edificio: 'Tacagua',
        piso: 1,
        letra:'L',
        montoMensual: 500
    },
    {
        edificio: 'San Martín',
        piso: 1,
        letra:'L',
        montoMensual: 500
    },
    {
        edificio: 'Mohedano',
        piso: 1,
        letra:'L',
        montoMensual: 500
    },
    {
        edificio: 'Caruata',
        piso: 1,
        letra:'L',
        montoMensual: 500
    },
    {
        edificio: 'El Tejar',
        piso: 1,
        letra:'L',
        montoMensual: 500
    },
];

const seedResidencias = async () => {
    try {
        // Conectar a la base de datos
        await mongoose.connect(process.env.DB_MONGO);
        console.log('✅ Conectado a la base de datos');

        // Eliminar residencias existentes
        await Residencia.deleteMany({});
        console.log('✅ Residencias existentes eliminadas');

        // Insertar residencias
        await Residencia.insertMany(residenciasData);
        console.log('✅ Residencias insertadas correctamente');
        console.log('   -', residenciasData.map(r => `${r.edificio} (${r.piso})`).join('\n   - '));

        mongoose.connection.close();
        console.log('✅ Conexión cerrada');
    } catch (error) {
        console.error('❌ Error al ejecutar el seeder:', error);
        process.exit(1);
    }
};

seedResidencias();

