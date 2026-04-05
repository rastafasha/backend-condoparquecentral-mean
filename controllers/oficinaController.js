const { response } = require('express');
const Oficina = require('../models/oficina');
const Profile = require('../models/profile'); 

const getOficinas = async(req, res) => {

    const oficinas = await Oficina.find()
    res.json({
        ok: true,
        oficinas
    });
};


const getOficina = async(req, res) => {

    const id = req.params.id;


    Oficina.findById(id, {})
        .exec((err, oficina) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Oficina',
                    errors: err
                });
            }
            if (!oficina) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El Oficina con el id ' + id + 'no existe',
                    errors: { message: 'No existe un Oficina con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                oficina: oficina
            });
        });


    
};

const crearOficina = async(req, res) => {

   const uid = req.uid; // ID del usuario autenticado
   
       try {
           // 1. Creamos el local vinculado al usuario
           const oficina = new Oficina({
               usuario: uid,
               ...req.body
           });
   
           const oficinaDB = await oficina.save();
   
           // 2. ACTUALIZACIÓN CRUCIAL: Agregamos el ID del nuevo oficina al array del Perfil
           // Usamos $push para que si ya tiene un oficina, simplemente agregue el nuevo
           const perfilActualizado = await Profile.findOneAndUpdate(
               { usuario: uid }, 
               { $push: { oficina: oficinaDB._id }, haveOficina: true },
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
               oficina: oficinaDB,
               perfil: 'Perfil actualizado con el nuevo oficina'
           });
   
       } catch (error) {
           console.log(error);
           res.status(500).json({
               ok: false,
               msg: 'Error al crear el oficina, contacte al admin'
           });
       }


};

const actualizarOficina = async(req, res) => {
    const id = req.params.id;
    const uid = req.uid; // ID del usuario que viene del JWT

    try {
        // 1. Buscamos si la oficina existe
        const oficinaDB = await Oficina.findById(id);

        if (!oficinaDB) {
            return res.status(404).json({
                ok: false,
                msg: 'Oficina no encontrada por el ID'
            });
        }

        // 2. SEGURIDAD: Validar que el usuario sea el dueño o sea ADMIN
        // (Convertimos a String para comparar correctamente los ObjectIDs)
        if (oficinaDB.usuario.toString() !== uid && req.role !== 'ADMIN_ROLE') {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes permisos para editar esta oficina'
            });
        }

        // 3. Preparamos los campos a actualizar (protegiendo el campo usuario)
        const { usuario, ...campos } = req.body;

        // 4. Actualizamos usando el Modelo 'Oficina' (con O mayúscula)
        const oficinaActualizada = await Oficina.findByIdAndUpdate(
            id, 
            campos, 
            { new: true } 
        );

        res.json({
            ok: true,
            oficina: oficinaActualizada
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar oficina, hable con el administrador'
        });
    }
};

const borrarOficina = async(req, res) => {
    const id = req.params.id; // ID de la oficina

    try {

        const oficina = await Oficina.findById(id);
        if (!oficina) {
            return res.status(500).json({
                ok: false,
                msg: 'oficina no encontrado por el id'
            });
        }

        await Oficina.findByIdAndDelete(id);

        res.json({
            ok: true,
            msg: 'oficina eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error hable con el admin'
        });
    }
};



module.exports = {
    getOficinas,
    getOficina,
    crearOficina,
    actualizarOficina,
    borrarOficina,
};