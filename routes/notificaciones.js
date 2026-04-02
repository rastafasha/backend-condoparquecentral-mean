const { Router } = require('express');
const router = Router();
const { validarJWT } = require('../middlewares/validar-jwt');
const { sendNotification } = require('../helpers/notificaciones');
const PushSubscription = require('../models/push-subscription');
const Usuario = require('../models/usuario');

// ==========================================
// 1. RUTA PARA GUARDAR SUSCRIPCIÓN
// ==========================================
router.post('/save-subscription', validarJWT, async (req, res) => {
    try {
        const subscription = req.body;
        const uid = req.uid;

        // A. Guardamos en el Modelo Independiente (RECOMENDADO para múltiples dispositivos)
        // Usamos el endpoint como clave única para no duplicar el mismo navegador
        await PushSubscription.findOneAndUpdate(
            { 'subscription.endpoint': subscription.endpoint }, 
            { usuario: uid, subscription: subscription },
            { upsert: true, new: true }
        );

        // B. (Opcional) Si aún quieres tenerlo en Usuario por compatibilidad:
        await Usuario.findByIdAndUpdate(uid, { pushSubscription: subscription });
        
        console.log('✅ Suscripción vinculada al usuario:', uid);

        // Mensaje de bienvenida inmediato
       await sendNotification(
            subscription, 
            '¡Bienvenido!', 
            'Ahora recibirás los avisos aquí.',
            '/home' // <--- Cuarto parámetro: la URL
        );
        
        res.status(201).json({ ok: true, msg: 'Suscripción guardada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al guardar suscripción' });
    }
});

// ==========================================
// 2. ENVÍO INDIVIDUAL (Nuevo Mensaje)
// ==========================================
router.post('/nuevo-mensaje', validarJWT, async (req, res) => {
    try {
        const { destinatarioId, mensaje, remitenteNombre } = req.body;

        // Buscamos todas las suscripciones de ese usuario (puede tener PC y Móvil)
        const subs = await PushSubscription.find({ usuario: destinatarioId });

        subs.forEach(s => {
            sendNotification(
                s.subscription, 
                '¡Nuevo Mensaje!', 
                `De ${remitenteNombre}: ${mensaje}`
            ).catch(err => {
                if (err.statusCode === 410) s.deleteOne(); // Limpieza automática
            });
        });

        res.json({ ok: true, msg: 'Procesando envío...' });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al enviar' });
    }
});

// ==========================================
// 3. ENVÍO MASIVO (A TODOS)
// ==========================================
router.post('/enviar-a-todos', validarJWT, async (req, res) => {
    const { titulo, mensaje } = req.body;
    try {
        const suscripciones = await PushSubscription.find();

        if (suscripciones.length === 0) {
            return res.json({ ok: true, msg: 'No hay dispositivos registrados' });
        }

        const promesas = suscripciones.map(s => 
            sendNotification(s.subscription, titulo, mensaje)
                .catch(err => { if (err.statusCode === 410) s.deleteOne(); })
        );

        await Promise.all(promesas);
        res.json({ ok: true, msg: `Enviado a ${suscripciones.length} dispositivos.` });

    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error en masivo' });
    }
});

module.exports = router;
