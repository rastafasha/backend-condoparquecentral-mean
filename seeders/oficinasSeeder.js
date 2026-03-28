const mongoose = require('mongoose');
require('dotenv').config();
const Oficina = require('../models/oficina');

const oficinasData = [
    {
        edificio: 'Catuche',
        letra: 'A',
        piso: '1',
        montoMensual: 800
    },
    {
        edificio: 'Tajamar',
        letra: 'B',
        piso: '2',
        montoMensual: 750
    },
    {
        edificio: 'Tacagua',
        letra: 'C',
        piso: 'Nivel Bolivar',
        montoMensual: 900
    }
];

const seedOficinas = async () => {
    try {
        await mongoose.connect(process.env.DB_MONGO);
        console.log('✅ Conectado a la base de datos');

        await Oficina.deleteMany({});
        console.log('✅ Oficinas existentes eliminadas');

        await Oficina.insertMany(oficinasData);
        console.log('✅ 3 Oficinas insertadas correctamente');
        oficinasData.forEach(o => {
            console.log(`   - ${o.edificio} ${o.letra} ${o.piso} ($${o.montoMensual})`);
        });

        mongoose.connection.close();
        console.log('✅ Conexión cerrada');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

seedOficinas();
