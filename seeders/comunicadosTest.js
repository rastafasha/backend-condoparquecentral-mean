const mongoose = require('mongoose');
require('dotenv').config();

const Usuario = require('../models/usuario');
const Profile = require('../models/profile');
const Residencia = require('../models/residencia');
const Local = require('../models/local');
const Comunicado = require('../models/comunicado');

const seedPruebaCartelera = async () => {
    try {
        await mongoose.connect(process.env.DB_MONGO);
        
        // 1. LIMPIEZA INICIAL (Cuidado en producción)
        await Promise.all([
            Usuario.deleteMany({ email: 'vecino@test.com' }),
            Comunicado.deleteMany({})
        ]);

        console.log('🧹 Limpieza completada...');

        // 2. CREAR USUARIO DE PRUEBA
        const usuario = new Usuario({
            username: 'VecinoMultitarea',
            email: 'vecino@test.com',
            password: 'hash_password_aqui',
            numdoc: 'V-12345678',
            role: 'USER_ROLE'
        });
        await usuario.save();

        // 3. CREAR PROPIEDADES EN PARQUE CENTRAL
        // Una residencia en Tajamar Piso 10
        const res1 = new Residencia({
            edificio: 'TAJAMAR',
            letra: 'B',
            piso: '10',
            montoMensual: 500,
            usuario: usuario._id
        });
        // Un local en el Sótano 1
        const loc1 = new Local({
            edificio: 'TAJAMAR',
            piso: 'SOTANO 1',
            letra: 'G', 
            montoMensual: 800,
            usuario: usuario._id
        });

        await Promise.all([res1.save(), loc1.save()]);

        // 4. CREAR PERFIL QUE VINCULA TODO
        const perfil = new Profile({
            first_name: 'Juan',
            last_name: 'Pérez',
            usuario: usuario._id,
            residencia: [res1._id],
            local: [loc1._id],
            haveResidencia: true,
            haveLocal: true
        });
        await perfil.save();

        // 5. CREAR COMUNICADOS DE PRUEBA (Diferentes alcances)
        await Comunicado.insertMany([
            {
                titulo: "🛠️ Mantenimiento de Ascensores",
                mensaje: "Se informa a los vecinos de TAJAMAR que el ascensor B estará en mantenimiento.",
                tipo: "MANTENIMIENTO",
                alcance_residencia: "TAJAMAR",
                creado_por: usuario._id // Simulando un admin
            },
            {
                titulo: "📢 Aviso General Parque Central",
                mensaje: "Recordamos el uso obligatorio de tapabocas en áreas comunes.",
                tipo: "CARTELERA",
                alcance_residencia: "TODOS",
                creado_por: usuario._id
            },
            {
                titulo: "🚨 Fumigación Sótanos",
                mensaje: "Atención locales comerciales del Sótano 1: fumigación este domingo.",
                tipo: "URGENTE",
                alcance_residencia: "TAJAMAR",
                creado_por: usuario._id
            }
        ]);

        console.log('✅ Seeder completado con éxito');
        console.log('👤 Usuario: vecino@test.com');
        console.log('🏢 Propiedades: Apto en Tajamar Piso 10 y Local en Sótano 1');
        
        mongoose.connection.close();
    } catch (error) {
        console.error('❌ Error en seeder:', error);
        mongoose.connection.close();
    }
};

seedPruebaCartelera();
