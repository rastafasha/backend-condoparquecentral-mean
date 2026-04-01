const { Router } = require('express');
const router = Router();
const { validarJWT } = require('../middlewares/validar-jwt');
const { sendNotification } = require('../helpers/notificaciones');
const Usuario = require('../models/usuario'); // Asegúrate de que la ruta a tu modelo sea correcta

// 1. Ruta para guardar la suscripción
// URL final: POST /api/notificaciones/save-subscription
router.post('/save-subscription', validarJWT, async (req, res) => {
    try {
        const subscription = req.body;
        const uid = req.uid; // ID que viene del validarJWT

        // Guardamos la suscripción en el modelo de Usuario
        await Usuario.findByIdAndUpdate(uid, { pushSubscription: subscription });
        
        console.log('Suscripción guardada para el usuario:', uid);
        
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

module.exports = router;
