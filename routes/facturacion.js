
/*
 Ruta: /api/facturacion
 */

const { Router } = require('express');
const router = Router();
const {
    generarFacturaDinamica,
    generarFacturacionMensualMasiva,
} = require('../controllers/facturacionController');

const { validarJWT } = require('../middlewares/validar-jwt');

// 1. Generar factura a UN solo usuario (Útil para nuevos inquilinos que llegan a mitad de mes)
router.post('/individual', validarJWT, generarFacturaDinamica);

// 2. El proceso masivo de fin de mes
router.post('/masiva', validarJWT, generarFacturacionMensualMasiva);


module.exports = router;
