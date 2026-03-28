const { response } = require('express');
const Local = require('../models/local');
const Tasabcv = require('../models/tasabcv'); 


const getTasas = async(req, res) => {

    const tasas = await Tasabcv.find()
    res.json({
        ok: true,
        tasas
    });
};


const getTasa = async(req, res) => {

    const id = req.params.id;


    Tasabcv.findById(id, {})
        .exec((err, local) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Tasabcv',
                    errors: err
                });
            }
            if (!local) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'La Tasa con el id ' + id + 'no existe',
                    errors: { message: 'No existe una Tasa con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                local: local
            });
        });


    
};

const crearTasa = async(req, res) => {
    const uid = req.uid; // ID del usuario autenticado

    try {
        // 1. Creamos la tasa vinculada al usuario
        const tasa = new Tasabcv({
            usuario: uid,
            ...req.body
        });

        const tasaDB = await tasa.save();

        // 2. ACTUALIZACIÓN CRUCIAL: Agregamos el ID del nueva tasa al array del Perfil
        const tasaActualizado = await Tasabcv.findOneAndUpdate(
            { usuario: uid }, 
            { $push: { tasa: tasaDB._id }, haveTasa: true },
            { new: true }
        );

        if (!tasaActualizado) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontró un tasa para este usuario'
            });
        }

        res.json({
            ok: true,
            tasa: tasaDB,
            perfil: 'Tasabcv actualizado con la nueva tasa'
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear el local, contacte al admin'
        });
    }
};

const actualizarTasa = async(req, res) => {
    const id = req.params.id; // ID de la Tasa
    const uid = req.uid;       // ID del Usuario que hace la petición

    try {
        const tasa = await Tasabcv.findById(id);

        if (!tasa) {
            return res.status(404).json({
                ok: false,
                msg: 'Tasa no encontrada'
            });
        }

        // VALIDACIÓN DE SEGURIDAD: 
        // Solo el dueño del local o un ADMIN deberían poder editarlo
        if (tasa.usuario.toString() !== uid && req.role !== 'ADMIN_ROLE') {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes permisos para editar esta tasa'
            });
        }

        // Preparamos los cambios (evitamos que el usuario cambie el dueño por error)
        const { usuario, ...campos } = req.body; 
        
        const tasaActualizada = await Tasabcv.findByIdAndUpdate(
            id, 
            campos, 
            { new: true } // Para que devuelva el documento ya modificado
        );

        res.json({
            ok: true,
            tasa: tasaActualizada
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar, hable con el administrador'
        });
    }
};

const borrarTasa = async(req, res) => {
    const id = req.params.id;
    const uid = req.uid;

    try {
        const tasaDB = await Tasabcv.findById(id);
        if (!tasaDB) {
            return res.status(404).json({ ok: false, msg: 'Tasa no encontrada' });
        }

        // Seguridad
        if (tasaDB.usuario.toString() !== uid && req.role !== 'ADMIN_ROLE') {
            return res.status(403).json({ ok: false, msg: 'No tiene permisos' });
        }

        // Limpiar el Perfil
        await Profile.findOneAndUpdate(
            { usuario: tasaDB.usuario },
            { $pull: { tasa: id } }
        );

        // Borrar el documento
        await Tasabcv.findByIdAndDelete(id);

        res.json({ ok: true, msg: 'Tasa eliminada y perfil actualizado' });

    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al borrar tasa' });
    }
};




module.exports = {
    getTasas,
    getTasa,
    crearTasa,
    actualizarTasa,
    borrarTasa,
};