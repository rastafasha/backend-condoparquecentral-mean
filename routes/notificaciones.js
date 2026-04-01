const { Router } = require('express');
const router = Router();
const { validarJWT } = require('../middlewares/validar-jwt');
const { sendNotification } = require('../helpers/notificaciones');
const Usuario = require('../models/usuario');
// 1. Ruta para guardar la suscripción
// URL final: POST /api/notificaciones/save-subscription
router.post('/save-subscription', validarJWT, async (req, res) => {
    try {
        const subscription = req.body;
        const uid = req.uid; // ID que viene del validarJWT

        // Guardamos la suscripción en el modelo de Usuario
        await Usuario.findByIdAndUpdate(uid, { pushSubscription: subscription });
        
        console.log('Suscripción guardada para el usuario:', uid);

        // Enviar mensaje de bienvenida
        await sendNotification(
            subscription, 
            '¡Bienvenido!', 
            'Ahora recibirás los avisos del condominio directamente aquí.'
        );
        
        res.status(201).json({
            ok: true,
            msg: 'Suscripción guardada con éxito'
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Error al guardar la suscripción' });
    }
});

// 2. Ruta para enviar mensaje (Corregido de app.post a router.post)
// URL final: POST /api/notificaciones/nuevo-mensaje
router.post('/nuevo-mensaje', validarJWT, async (req, res) => {
    try {
        const { destinatarioId, mensaje, remitenteNombre } = req.body;

        // Buscamos al destinatario en la DB
        const destinatario = await Usuario.findById(destinatarioId);

        if (destinatario && destinatario.pushSubscription) {
            // Usamos el helper para enviar la notificación
            await sendNotification(
                destinatario.pushSubscription, 
                '¡Nuevo Mensaje!', 
                `De ${remitenteNombre}: ${mensaje}`
            );
        }

        res.json({ ok: true, msg: 'Notificación procesada' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Error al enviar notificación' });
    }
});

router.post('/enviar-a-todos', validarJWT, async (req, res) => {
    const { titulo, mensaje } = req.body;

    try {
        // 1. Buscamos solo a los usuarios que TIENEN una suscripción guardada
        const usuarios = await Usuario.find({ 
            pushSubscription: { $ne: null } 
        });

        if (usuarios.length === 0) {
            return res.json({ ok: true, msg: 'No hay usuarios suscritos' });
        }

        // 2. Enviamos todas las notificaciones en paralelo para mayor velocidad
        const promesasNotificaciones = usuarios.map( user => {
            return sendNotification(user.pushSubscription, titulo, mensaje);
        });

        // Esperamos a que todas se procesen
        await Promise.all(promesasNotificaciones);

        res.json({
            ok: true,
            msg: `Notificación enviada a ${usuarios.length} dispositivos.`
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al enviar masivo' });
    }
});

module.exports = router;
