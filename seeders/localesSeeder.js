const mongoose = require('mongoose');
require('dotenv').config();
const Local = require('../models/local');

const localesData = [
    {
        edificio: 'San Martín',
        letra: 'L1',
        piso: 'Nivel Bolívar',
        montoMensual: 1200
    },
    {
        edificio: 'Mohedano',
        letra: 'L2',
        piso: 'Lecuna',
        montoMensual: 1100
    },
    {
        edificio: 'Caruata',
        letra: 'L3',
        piso: 'Mesanina',
        montoMensual: 1300
    }
];

const seedLocales = async () => {
    try {
        await mongoose.connect(process.env.DB_MONGO);
        console.log('✅ Conectado a la base de datos');

        await Local.deleteMany({});
        console.log('✅ Locales existentes eliminados');

        await Local.insertMany(localesData);
        console.log('✅ 3 Locales insertados correctamente');
        localesData.forEach(l => {
            console.log(`   - ${l.edificio} ${l.letra} ${l.piso} ($${l.montoMensual})`);
        });

        mongoose.connection.close();
        console.log('✅ Conexión cerrada');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

seedLocales();
