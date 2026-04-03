'use strict'
const PushSubscription = require('../models/push-subscription');
const Usuario = require('../models/usuario');
const { sendNotification } = require('../helpers/notificaciones');

// 1. Guardar Suscripción
const guardarSuscripcion = async (req, res) => {
    try {
        const subscription = req.body;
        const uid = req.uid;

        await PushSubscription.findOneAndUpdate(
            { 'subscription.endpoint': subscription.endpoint }, 
            { usuario: uid, subscription: subscription },
            { upsert: true, new: true }
        );

        await Usuario.findByIdAndUpdate(uid, { pushSubscription: subscription });
        
        await sendNotification(
            subscription, 
            '¡Bienvenido!', 
            'Ahora recibirás los avisos aquí.',
            '/home'
        );
        
        res.status(201).json({ ok: true, msg: 'Suscripción guardada' });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al guardar suscripción' });
    }
};

// 2. Envío Individual
const enviarPushIndividual = async (req, res) => {
    try {
        const { destinatarioId, mensaje, remitenteNombre } = req.body;
        const subs = await PushSubscription.find({ usuario: destinatarioId });

        subs.forEach(s => {
            sendNotification(
                s.subscription, 
                '¡Nuevo Mensaje!', 
                `De ${remitenteNombre}: ${mensaje}`
            ).catch(err => {
                if (err.statusCode === 410) s.deleteOne();
            });
        });

        res.json({ ok: true, msg: 'Procesando envío...' });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al enviar' });
    }
};

// 3. Envío Masivo
const enviarPushATodos = async (req, res) => {
    const { titulo, mensaje } = req.body;
    try {
        const suscripciones = await PushSubscription.find();
        if (suscripciones.length === 0) return res.json({ ok: true, msg: 'No hay dispositivos' });

        const promesas = suscripciones.map(s => 
            sendNotification(s.subscription, titulo, mensaje)
                .catch(err => { if (err.statusCode === 410) s.deleteOne(); })
        );

        await Promise.all(promesas);
        res.json({ ok: true, msg: `Enviado a ${suscripciones.length} dispositivos.` });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error en masivo' });
    }
};

module.exports = {
    guardarSuscripcion,
    enviarPushIndividual,
    enviarPushATodos
};
