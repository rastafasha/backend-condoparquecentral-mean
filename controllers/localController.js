const { response } = require('express');
const Local = require('../models/local');
const Profile = require('../models/profile'); 


const getLocals = async(req, res) => {

    const locales = await Local.find()
    res.json({
        ok: true,
        locales
    });
};


const getLocal = async(req, res) => {

    const id = req.params.id;


    Local.findById(id, {})
        .exec((err, local) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Local',
                    errors: err
                });
            }
            if (!local) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El Local con el id ' + id + 'no existe',
                    errors: { message: 'No existe un Local con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                local: local
            });
        });


    
};

const crearLocal = async(req, res) => {
    const uid = req.uid; // ID del usuario autenticado

    try {
        // 1. Creamos el local vinculado al usuario
        const local = new Local({
            usuario: uid,
            ...req.body
        });

        const localDB = await local.save();

        // 2. ACTUALIZACIÓN CRUCIAL: Agregamos el ID del nuevo local al array del Perfil
        // Usamos $push para que si ya tiene un local, simplemente agregue el nuevo
        const perfilActualizado = await Profile.findOneAndUpdate(
            { usuario: uid }, 
            { $push: { local: localDB._id }, haveLocal: true },
            { new: true }
        );

        if (!perfilActualizado) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontró un perfil para este usuario'
            });
        }

        res.json({
            ok: true,
            local: localDB,
            perfil: 'Perfil actualizado con el nuevo local'
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear el local, contacte al admin'
        });
    }
};

const actualizarLocal = async(req, res) => {
    const id = req.params.id; // ID del Local
    const uid = req.uid;       // ID del Usuario que hace la petición

    try {
        const local = await Local.findById(id);

        if (!local) {
            return res.status(404).json({
                ok: false,
                msg: 'Local no encontrado'
            });
        }

        // VALIDACIÓN DE SEGURIDAD: 
        // Solo el dueño del local o un ADMIN deberían poder editarlo
        if (local.usuario.toString() !== uid && req.role !== 'ADMIN_ROLE') {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes permisos para editar este local'
            });
        }

        // Preparamos los cambios (evitamos que el usuario cambie el dueño por error)
        const { usuario, ...campos } = req.body; 
        
        const localActualizado = await Local.findByIdAndUpdate(
            id, 
            campos, 
            { new: true } // Para que devuelva el documento ya modificado
        );

        res.json({
            ok: true,
            local: localActualizado
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar, hable con el administrador'
        });
    }
};

const borrarLocal = async(req, res) => {
    const id = req.params.id;
    const uid = req.uid;

    try {
        const localDB = await Local.findById(id);
        if (!localDB) {
            return res.status(404).json({ ok: false, msg: 'Local no encontrado' });
        }

        // Seguridad
        if (localDB.usuario.toString() !== uid && req.role !== 'ADMIN_ROLE') {
            return res.status(403).json({ ok: false, msg: 'No tiene permisos' });
        }

        // Limpiar el Perfil
        await Profile.findOneAndUpdate(
            { usuario: localDB.usuario },
            { $pull: { local: id } }
        );

        // Borrar el documento
        await Local.findByIdAndDelete(id);

        res.json({ ok: true, msg: 'Local eliminado y perfil actualizado' });

    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al borrar local' });
    }
};




module.exports = {
    getLocals,
    getLocal,
    crearLocal,
    actualizarLocal,
    borrarLocal,
};