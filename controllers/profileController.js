const { response } = require('express');
const Profile = require('../models/profile');
const Facturacion = require('../models/facturacion');

const crearProfile = async(req, res) => {

    const uid = req.uid;
    const profile = new Profile({
        usuario: uid,
        ...req.body
    });

    try {

        const profileDB = await profile.save();

        res.json({
            ok: true,
            profile: profileDB
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el admin'
        });
    }


};

const actualizarProfile = async(req, res) => {

    const id = req.params.id;
    const uid = req.uid;

    try {

        const profile = await Profile.findById(id);
        if (!profile) {
            return res.status(500).json({
                ok: false,
                msg: 'profile no encontrado por el id'
            });
        }

        const cambiosProfile = {
            ...req.body,
            usuario: uid
        }

        const profileActualizado = await Profile.findByIdAndUpdate(id, cambiosProfile, { new: true });

        res.json({
            ok: true,
            profileActualizado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
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
    obtenerEstadoCuentaUsuario


};