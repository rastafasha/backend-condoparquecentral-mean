const { response } = require('express');
const Profile = require('../models/profile');
const Facturacion = require('../models/facturacion');
const Residencia = require('../models/residencia'); // Ajusta la ruta a tus modelos
const Oficina = require('../models/oficina');
const Local = require('../models/local');

const crearProfile = async(req, res) => {
    const uid = req.uid;
    const { residencia, oficina, local, ...datosPerfil } = req.body;

    try {
        const IDs_Ubicacion = {};

        // 1. Si viene data de Residencia, crear el documento primero
        if (residencia && residencia.length > 0) {
            const nuevaRes = new Residencia(residencia[0]);
            const resDB = await nuevaRes.save();
            IDs_Ubicacion.residencia = [resDB._id];
        }

        // 2. Si viene data de Oficina, crear el documento
        if (oficina && oficina.length > 0) {
            const nuevaOfi = new Oficina(oficina[0]);
            const ofiDB = await nuevaOfi.save();
            IDs_Ubicacion.oficina = [ofiDB._id];
        }

        // 3. Si viene data de Local, crear el documento
        if (local && local.length > 0) {
            const nuevoLoc = new Local(local[0]);
            const locDB = await nuevoLoc.save();
            IDs_Ubicacion.local = [locDB._id];
        }

        // 4. Crear el Perfil con los IDs obtenidos
        const profile = new Profile({
            usuario: uid,
            ...datosPerfil,
            ...IDs_Ubicacion // Esto añade los arrays de IDs correctos
        });

        const profileDB = await profile.save();

        res.json({
            ok: true,
            profile: profileDB
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear el perfil, hable con el admin'
        });
    }
};


const actualizarProfile = async(req, res) => {
    const id = req.params.id;
    const uid = req.uid;

    try {
        const profileDB = await Profile.findById(id);
        if (!profileDB) {
            return res.status(404).json({ ok: false, msg: 'Perfil no encontrado' });
        }

        // 1. Extraemos los objetos para procesarlos y que NO queden en 'datosRestantes'
        const { residencia, oficina, local, ...datosRestantes } = req.body;

        // 2. Sincronizar RESIDENCIA
        if (residencia && residencia.length > 0) {
            const resData = residencia[0]; // Extraemos el objeto del array
            if (resData._id) {
                // Actualizamos la colección de Residencias
                await Residencia.findByIdAndUpdate(resData._id, {
                    edificio: resData.edificio,
                    piso: resData.piso,
                    letra: resData.letra
                });
            }
        }

        // 3. Sincronizar OFICINA
        if (oficina && oficina.length > 0) {
            const ofiData = oficina[0];
            if (ofiData._id) {
                await Oficina.findByIdAndUpdate(ofiData._id, {
                    edificio: ofiData.edificio,
                    piso: ofiData.piso,
                    letra: ofiData.letra
                });
            }
        }

        // 4. Sincronizar LOCAL
        if (local && local.length > 0) {
            const locData = local[0];
            if (locData._id) {
                await Local.findByIdAndUpdate(locData._id, {
                    edificio: locData.edificio,
                    piso: locData.piso,
                    letra: locData.letra
                });
            }
        }

        // 5. IMPORTANTE: Construimos el objeto de actualización del PERFIL
        // Solo incluimos los campos básicos. NO incluimos los objetos de residencia/oficina
        // para que Mongoose no intente validarlos como IDs.
        const cambiosProfile = {
            ...datosRestantes,
            usuario: uid
        };

        const profileActualizado = await Profile.findByIdAndUpdate(id, cambiosProfile, { new: true });

        res.json({
            ok: true,
            profile: profileActualizado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Error al actualizar' });
    }
};

const agregarPropiedadExtra = async(req, res) => {
    // El 'uid' viene del validarJWT
    const uid = req.uid; 
    const { tipo, datos } = req.body; 
    // tipo: 'residencia', 'oficina', 'local'
    // datos: { edificio, piso, letra }

    try {
        // 1. Buscamos el perfil del usuario logueado
        const profileDB = await Profile.findOne({ usuario: uid });
        if (!profileDB) {
            return res.status(404).json({ ok: false, msg: 'Perfil no encontrado' });
        }

        let nuevaUbicacion;
        let campoPerfil = tipo; // El nombre del campo en el Schema (residencia, oficina, local)

        // 2. Instanciamos según el tipo
        if (tipo === 'residencia') nuevaUbicacion = new Residencia(datos);
        else if (tipo === 'oficina') nuevaUbicacion = new Oficina(datos);
        else if (tipo === 'local') nuevaUbicacion = new Local(datos);
        else return res.status(400).json({ ok: false, msg: 'Tipo de propiedad no válido' });

        // 3. Guardamos en la colección hija
        const ubicacionGuardada = await nuevaUbicacion.save();

        // 4. Actualizamos el Perfil usando $push para no borrar lo que ya existe
        // También ponemos el switch 'have...' en true por si acaso estaba en false
        const campoSwitch = `have${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
        
        const perfilActualizado = await Profile.findByIdAndUpdate(
            profileDB._id, 
            { 
                $push: { [campoPerfil]: ubicacionGuardada._id },
                [campoSwitch]: true 
            }, 
            { new: true }
        );

        res.json({
            ok: true,
            msg: `${tipo} agregada con éxito`,
            perfil: perfilActualizado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado, hable con el administrador'
        });
    }
};

const getProfiles = async(req, res) => {

    const profiles = await Profile.find()
        .populate('usuario')

    res.json({
        ok: true,
        profiles
    });
};

const getProfilesrole = async(req, res) => {

    // const profiles = await Profile.find({ role: 'EDITOR' })
    //     .populate('usuario', 'role editor');

    // res.json({
    //     ok: true,
    //     profiles
    // });

     Profile.find(

        // {
        //     where: {
        //         role: 'EDITOR'
        //     }
        // }
     )
    .populate('usuario', 'username role email')
    .exec((err, profiles) => {
        if (err) {
            res.status(500).send({ message: 'Ocurrió un error en el servidor.' });
        } else {
            if (profiles) {
                res.status(200).send({ profiles: profiles });
            } else {
                res.status(500).send({ message: 'No se encontró ningun dato en esta sección.' });
            }
        }
    });

};


const getProfile = async(req, res) => {

    const id = req.params.id;

    Profile.findById(id)
        .populate('usuario')
        .exec((err, profile) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar profile',
                    errors: err
                });
            }
            if (!profile) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El profile con el id ' + id + 'no existe',
                    errors: { message: 'No existe un profile con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                profile: profile
            });
        });

};




const borrarProfile = async(req, res) => {

    const id = req.params.id;

    try {

        const profile = await Profile.findById(id);
        if (!profile) {
            return res.status(500).json({
                ok: false,
                msg: 'profile no encontrado por el id'
            });
        }

        await Profile.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'profile eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};

const listarProfilePorUsuario = async (req, res) => {
    try {
        const id = req.params.id; // El ID del Usuario

        // Buscamos el perfil y traemos TODO lo relacionado
        const profile_data = await Profile.findOne({ usuario: id })
            .populate('usuario', 'username email role') // Datos básicos del user
            .populate('residencia')
            .populate('oficina')
            .populate('local');

        if (!profile_data) {
            return res.status(404).json({ ok: false, msg: 'El usuario aún no tiene un perfil creado' });
        }

        res.status(200).json({
            ok: true,
            profile: profile_data
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Error al obtener el perfil' });
    }
};


const obtenerEstadoCuentaUsuario = async (req, res) => {
    try {
        const { id } = req.params; // ID del Usuario

        // 1. Buscamos el Perfil con sus propiedades
        const perfil = await Profile.findOne({ usuario: id })
            .populate('residencia oficina local', 'edificio piso letra montoMensual');

        if (!perfil) {
            return res.status(404).json({ ok: false, msg: 'Perfil no encontrado' });
        }

        // 2. Buscamos todas las facturas PENDIENTES de ese usuario
        const facturasPendientes = await Facturacion.find({ 
            usuario: id, 
            estado: 'PENDIENTE' 
        }).sort({ createdAt: -1 }); // De la más reciente a la más antigua

        // 3. Calculamos el total de la deuda sumando el virtual 'totalPagar' de cada factura
        const deudaTotal = facturasPendientes.reduce((acc, factura) => {
            return acc + factura.totalPagar; // 'totalPagar' es el virtual que creamos antes
        }, 0);

        res.status(200).json({
            ok: true,
            perfil,
            resumenDeuda: {
                totalFacturasPendientes: facturasPendientes.length,
                montoTotalDeuda: deudaTotal.toFixed(2),
                facturas: facturasPendientes
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Error al obtener el estado de cuenta' });
    }
};



module.exports = {
    crearProfile,
    getProfiles,
    getProfile,
    actualizarProfile,
    borrarProfile,
    listarProfilePorUsuario,
    getProfilesrole,
    obtenerEstadoCuentaUsuario,
    agregarPropiedadExtra


};