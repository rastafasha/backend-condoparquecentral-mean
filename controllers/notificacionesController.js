const Notificacion = require('../models/notificacion');

// GET: /api/notificaciones/historial
const obtenerHistorial = async (req, res) => {
    try {
        const notificaciones = await Notificacion.find({ usuario: req.uid })
            .sort({ createdAt: -1 }).limit(50);
        res.json({ ok: true, notificaciones });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al obtener historial' });
    }
};

// GET: /api/notificaciones/unread-count
const obtenerContador = async (req, res) => {
    try {
        const count = await Notificacion.countDocuments({ usuario: req.uid, leido: false });
        res.json({ ok: true, count });
    } catch (error) {
        res.status(500).json({ ok: false, count: 0 });
    }
};

// PUT: /api/notificaciones/marcar-leidas (TODAS)
const marcarTodasLeidas = async (req, res) => {
    try {
        await Notificacion.updateMany({ usuario: req.uid, leido: false }, { leido: true });
        res.json({ ok: true, msg: 'Notificaciones limpias' });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al actualizar' });
    }
};

// PUT: /api/notificaciones/:id (UNA SOLA - Para el Offcanvas)
const marcarUnaLeida = async (req, res) => {
    try {
        const id = req.params.id;
        const notif = await Notificacion.findOneAndUpdate(
            { _id: id, usuario: req.uid }, 
            { leido: true }, 
            { new: true }
        );
        if (!notif) return res.status(404).json({ ok: false, msg: 'No encontrada' });
        res.json({ ok: true, notif });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al actualizar' });
    }
};

module.exports = {
    obtenerHistorial,
    obtenerContador,
    marcarTodasLeidas,
    marcarUnaLeida
};
