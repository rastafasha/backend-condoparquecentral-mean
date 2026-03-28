const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const Usuario = require('../models/usuario');

const usuariosData = [
    {
        username: 'Super',
        email: 'superadmin@superadmin.com',
        password: 'password',
        role: 'SUPERADMIN_ROLE'
    },
    {
        username: 'Admin',
        email: 'admin@admin.com',
        password: 'password',
        role: 'ADMIN_ROLE'
    },
    {
        username: 'Juan',
        email: 'juan@propietario.com',
        password: 'password',
        role: 'USER_ROLE'
    },
    {
        username: 'Ana',
        email: 'ana@propietaria.com',
        password: 'password',
        role: 'USER_ROLE'
    },
    {
        username: 'Carlos',
        email: 'carlos@propietario.com',
        password: 'password',
        role: 'USER_ROLE'
    }
];

const seedUsuarios = async () => {
    try {
        // Conectar a la base de datos
        await mongoose.connect(process.env.DB_MONGO);
        console.log('✅ Conectado a la base de datos');

        // Eliminar usuarios existentes
        await Usuario.deleteMany({});
        console.log('✅ Usuarios existentes eliminados');

        // Hashear contraseñas e insertar usuarios
        const usuariosConHash = await Promise.all(
            usuariosData.map(async (usuario) => {
                const salt = bcrypt.genSaltSync();
                usuario.password = bcrypt.hashSync(usuario.password, salt);
                return usuario;
            })
        );

        await Usuario.insertMany(usuariosConHash);
        console.log('✅ Usuarios insertados correctamente');
        console.log('   - superadmin@superadmin.com (SUPERADMIN_ROLE)');
        console.log('   - admin@admin.com (ADMIN_ROLE)');
        console.log('   - user@user.com (USER_ROLE)');

        mongoose.connection.close();
        console.log('✅ Conexión cerrada');
    } catch (error) {
        console.error('❌ Error al ejecutar el seeder:', error);
        process.exit(1);
    }
};

seedUsuarios();

