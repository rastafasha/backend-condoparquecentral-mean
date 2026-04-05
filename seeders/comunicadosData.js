const mongoose = require('mongoose');
require('dotenv').config();

const Usuario = require('../models/usuario');
const Profile = require('../models/profile');
const Residencia = require('../models/residencia');
const Local = require('../models/local');
const Comunicado = require('../models/comunicado');

const seedParqueCentral = async () => {
    try {
        await mongoose.connect(process.env.DB_MONGO);
        await Comunicado.deleteMany({}); // Limpiamos facturas viejas
        
        // 1. Buscamos a tus usuarios y a un ADMINISTRADOR para la autoría
        const adminAutor = await Usuario.findOne({ 
            role: { $in: ['SUPERADMIN_ROLE', 'ADMIN_ROLE'] } 
        });
        
        const juan = await Usuario.findOne({ email: 'juan@propietario.com' });
        const ana = await Usuario.findOne({ email: 'ana@propietaria.com' });
        const carlos = await Usuario.findOne({ email: 'carlos@propietario.com' });

        if (!juan || !ana || !carlos || !adminAutor) {
            console.log('❌ Error: Faltan usuarios o no existe un Admin/Superadmin en la BD.');
            return mongoose.connection.close();
        }

        // 2. Limpiamos datos previos de esta prueba
        await Promise.all([
            Profile.deleteMany({ usuario: { $in: [juan._id, ana._id, carlos._id] } }),
            Residencia.deleteMany({ usuario: { $in: [juan._id, ana._id, carlos._id] } }),
            Local.deleteMany({ usuario: { $in: [juan._id, ana._id, carlos._id] } }),
            Comunicado.deleteMany({})
        ]);

        // 3. ASIGNAMOS PROPIEDADES
        const resJuan = await new Residencia({
            edificio: 'TAJAMAR', letra: 'B', piso: '10', montoMensual: 450, usuario: juan._id
        }).save();

        const resAna = await new Residencia({
            edificio: 'CATUCHE', letra: 'A', piso: '5', montoMensual: 400, usuario: ana._id
        }).save();

        const locCarlos = await new Local({
            edificio: 'TAJAMAR', letra: 'H', piso: 'SOTANO 1', montoMensual: 1200, usuario: carlos._id
        }).save();

        // 4. CREAMOS LOS PERFILES
        await Profile.insertMany([
            { first_name: 'Juan', last_name: 'Prop', usuario: juan._id, residencia: [resJuan._id], haveResidencia: true },
            { first_name: 'Ana', last_name: 'Prop', usuario: ana._id, residencia: [resAna._id], haveResidencia: true },
            { first_name: 'Carlos', last_name: 'Prop', usuario: carlos._id, local: [locCarlos._id], haveLocal: true }
        ]);

        // 5. CREAMOS COMUNICADOS (Ahora creados por el Admin/Superadmin)
        await Comunicado.insertMany([
            {
                titulo: "🛠️ Mantenimiento Tajamar",
                mensaje: "Atención vecinos de TAJAMAR: revisión de ascensores mañana.",
                tipo: "MANTENIMIENTO",
                alcance_residencia: "TAJAMAR",
                creado_por: adminAutor._id // <--- CAMBIO AQUÍ
            },
            {
                titulo: "🚨 Alerta Catuche",
                mensaje: "Corte de agua programado para CATUCHE desde las 8 PM.",
                tipo: "URGENTE",
                alcance_residencia: "CATUCHE",
                creado_por: adminAutor._id // <--- CAMBIO AQUÍ
            },
            {
                titulo: "📢 General Parque Central",
                mensaje: "Se informa a TODAS las torres sobre la jornada de vacunación.",
                tipo: "CARTELERA",
                alcance_residencia: "TODOS",
                creado_por: adminAutor._id // <--- CAMBIO AQUÍ
            }
        ]);

        console.log('✅ Seeder de Parque Central completado');
        console.log(`Autor de los avisos: ${adminAutor.username} (${adminAutor.role})`);
        console.log('------------------------------------');

        mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error:', error);
        mongoose.connection.close();
    }
};

seedParqueCentral();
