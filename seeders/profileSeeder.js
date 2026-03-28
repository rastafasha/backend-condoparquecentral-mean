const mongoose = require('mongoose');
require('dotenv').config();
const Profile = require('../models/profile');
const Usuario = require('../models/usuario');
const Residencia = require('../models/residencia');
const Oficina = require('../models/oficina');
const Local = require('../models/local');

const profilesDataTemplate = [
    // 1. Propietario 1: SOLO RESIDENCIA (Juan Lopez)
    {
        first_name: 'Juan',
        last_name: 'Lopez',
        telmovil: '+58 412-1234567',
        haveResidencia: true,
        haveOficina: false,
        haveLocal: false,
        residencia: [],
        oficina: [],
        local: [],
        statusFinanciero: 'AL_DIA',
        deudaTotalAcumulada: 0
    },
    // 2. Propietario 2: RESIDENCIA + LOCAL + OFICINA (Ana Martinez)
    {
        first_name: 'Ana',
        last_name: 'Martinez',
        telhome: '0212-1234567',
        telmovil: '+58 414-7654321',
        haveResidencia: true,
        haveOficina: true,
        haveLocal: true,
        residencia: [],
        oficina: [],
        local: [],
        statusFinanciero: 'EN_REVISION',
        deudaTotalAcumulada: 1200
    },
    // 3. Propietario 3: RESIDENCIA + LOCAL (Carlos Perez)
    {
        first_name: 'Carlos',
        last_name: 'Perez',
        telmovil: '+58 416-9876543',
        haveResidencia: true,
        haveOficina: false,
        haveLocal: true,
        residencia: [],
        oficina: [],
        local: [],
        statusFinanciero: 'MOROSO',
        deudaTotalAcumulada: 2500
    }
];

const seedProfiles = async () => {
    try {
        await mongoose.connect(process.env.DB_MONGO);
        console.log('✅ Conectado a la base de datos');

        // Eliminar profiles existentes
        await Profile.deleteMany({});
        console.log('✅ Profiles existentes eliminados');

        // Obtener solo USERS propietarios (no admins)
        const usuariosPropietarios = await Usuario.find({ role: 'USER_ROLE' }).sort({ username: 1 }).limit(3);
        if (usuariosPropietarios.length < 3) {
            throw new Error('Ejecuta usuarioSeeder.js actualizado - necesita al menos 3 USER_ROLE propietarios');
        }
        const juan = await Usuario.findOne({username: 'Juan'});
        const ana = await Usuario.findOne({username: 'Ana'});
        const carlos = await Usuario.findOne({username: 'Carlos'}); 

        // Obtener propiedades
        const residencias = await Residencia.find({}).limit(3);
        const oficinas = await Oficina.find({}).limit(3);
        const locales = await Local.find({}).limit(3);

        // Asignar
        if (!juan || !ana || !carlos) {
          throw new Error('No se encontraron todos los usuarios Juan, Ana, Carlos');
        }

        profilesDataTemplate[0].usuario = juan._id;
        if (residencias[0]) profilesDataTemplate[0].residencia = [residencias[0]._id];

        profilesDataTemplate[1].usuario = ana._id;
        if (residencias[2]) profilesDataTemplate[1].residencia = [residencias[2]._id];
        if (oficinas[0]) profilesDataTemplate[1].oficina = [oficinas[0]._id];
        if (locales[1]) profilesDataTemplate[1].local = [locales[1]._id];

        profilesDataTemplate[2].usuario = carlos._id;
        if (residencias[1]) profilesDataTemplate[2].residencia = [residencias[1]._id];
        if (locales[0]) profilesDataTemplate[2].local = [locales[0]._id];

        const profilesGuardados = await Profile.insertMany(profilesDataTemplate);
        console.log('✅ 3 Profiles de propietarios (USER_ROLE) insertados correctamente');

        // Logs
        const profilesConPopulate = await Profile.find()
            .populate('usuario', 'username email role')
            .populate('residencia', 'edificio')
            .populate('oficina', 'edificio letra piso')
            .populate('local', 'edificio letra piso');
        
        profilesConPopulate.forEach((profile, index) => {
            console.log(`   ${index + 1}. ${profile.first_name} ${profile.last_name}`);
            console.log(`      Usuario: ${profile.usuario.username} (${profile.usuario.email}) - ${profile.usuario.role}`);
            console.log(`      Propiedades: Resi=[${profile.residencia?.map(r=>r.edificio).join(',') || 'none'}], Oficina=[${profile.oficina?.map(o=>`${o.edificio} ${o.letra}`).join(',') || 'none'}], Local=[${profile.local?.map(l=>`${l.edificio} ${l.letra}`).join(',') || 'none'}]`);
            console.log(`      Status: ${profile.statusFinanciero} | Deuda: $${profile.deudaTotalAcumulada.toLocaleString()}`);
            console.log('');
        });

        mongoose.connection.close();
        console.log('✅ Conexión cerrada');
    } catch (error) {
        console.error('❌ Error:', error.message);
        mongoose.connection.close();
        process.exit(1);
    }
};

seedProfiles();
