const { response } = require('express');
const Residencia = require('../models/residencia');
const Profile = require('../models/profile'); 

const getResidencias = async(req, res) => {

    const residencias = await Residencia.find()
    res.json({
        ok: true,
        residencias
    });
};


const getResidencia = async(req, res) => {

    const id = req.params.id;


    Residencia.findById(id, {})
        .exec((err, residencia) => {
            if (err) {
                return res.status(500).json({
                    ok: false,
                    mensaje: 'Error al buscar Residencia',
                    errors: err
                });
            }
            if (!residencia) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'El Residencia con el id ' + id + 'no existe',
                    errors: { message: 'No existe un Residencia con ese ID' }
                });

            }
            res.status(200).json({
                ok: true,
                residencia: residencia
            });
        });


    
};

const crearResidencia = async(req, res) => {

   const uid = req.uid; // ID del usuario autenticado
      
          try {
              // 1. Creamos el local vinculado al usuario
              const residencia = new Residencia({
                  usuario: uid,
                  ...req.body
              });
      
              const residenciaDB = await residencia.save();
      
              // 2. ACTUALIZACIÓN CRUCIAL: Agregamos el ID del nuevo residencia al array del Perfil
              // Usamos $push para que si ya tiene un residencia, simplemente agregue el nuevo
              const perfilActualizado = await Profile.findOneAndUpdate(
                  { usuario: uid }, 
                  { $push: { residencia: residenciaDB._id }, haveResidencia: true },
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
                  residencia: residenciaDB,
                  perfil: 'Perfil actualizado con el nuevo residencia'
              });
      
          } catch (error) {
              console.log(error);
              res.status(500).json({
                  ok: false,
                  msg: 'Error al crear el residencia, contacte al admin'
              });
          }


};

const actualizarResidencia = async(req, res) => {
    const id = req.params.id;
    const uid = req.uid; // ID del usuario que viene del token

    try {
        // 1. Buscamos la residencia
        const residenciaDB = await Residencia.findById(id);

        if (!residenciaDB) {
            return res.status(404).json({
                ok: false,
                msg: 'Residencia no encontrada'
            });
        }

        // 2. SEGURIDAD: Validamos que quien edita sea el dueño o un ADMIN
        if (residenciaDB.usuario.toString() !== uid && req.role !== 'ADMIN_ROLE') {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes permisos para editar esta residencia'
            });
        }

        // 3. Preparamos los cambios (protegemos el campo usuario)
        const { usuario, ...campos } = req.body;

        // 4. Actualizamos usando el MODELO (Residencia con Mayúscula)
        const residenciaActualizada = await Residencia.findByIdAndUpdate(
            id, 
            campos, 
            { new: true }
        );

        res.json({
            ok: true,
            residencia: residenciaActualizada
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar residencia, hable con el admin'
        });
    }
};

const borrarResidencia = async(req, res) => {
    const id = req.params.id;
    const uid = req.uid;

    try {
        const residenciaDB = await Residencia.findById(id);
        if (!residenciaDB) {
            return res.status(404).json({ ok: false, msg: 'Residencia no encontrada' });
        }

        // Seguridad
        if (residenciaDB.usuario.toString() !== uid && req.role !== 'ADMIN_ROLE') {
            return res.status(403).json({ ok: false, msg: 'No tiene permisos' });
        }

        // Limpiar el Perfil
        await Profile.findOneAndUpdate(
            { usuario: residenciaDB.usuario },
            { $pull: { residencia: id } }
        );

        // Borrar el documento
        await Residencia.findByIdAndDelete(id);

        res.json({ ok: true, msg: 'Residencia eliminada y perfil actualizado' });

    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al borrar residencia' });
    }
};




module.exports = {
    getResidencias,
    getResidencia,
    crearResidencia,
    actualizarResidencia,
    borrarResidencia,
};