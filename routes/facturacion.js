
/*
 Ruta: /api/facturacion
 */

const { Router } = require('express');
const router = Router();
const {
    generarFacturaDinamica,
    generarFacturacionMensualMasiva,
    getFacturaciones,
    getFactura,
    escribirPDF,
    listarPaymentPorStatus,
    listarStatusFacturas,
    getFacturasByUser
} = require('../controllers/facturacionController');

const { validarJWT } = require('../middlewares/validar-jwt');
router.get('/', 
    // validarJWT, 
    getFacturaciones);
router.get('/status/pagos',   listarStatusFacturas);
router.get('/:id',  
    // validarJWT,
     getFactura);
router.get('/user/:id',
    //  validarJWT, 
     getFacturasByUser);
router.get('/status/:estado',   listarPaymentPorStatus);




// 1. Generar factura a UN solo usuario (Útil para nuevos inquilinos que llegan a mitad de mes)
router.post('/individual', validarJWT, generarFacturaDinamica);

// 2. El proceso masivo de fin de mes
router.post('/masiva', validarJWT, generarFacturacionMensualMasiva);
router.post('/generar-pdf', validarJWT, escribirPDF);


module.exports = router;
