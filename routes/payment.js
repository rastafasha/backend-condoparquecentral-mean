/*
 Ruta: /api/payments
 */

const { Router } = require('express');
const router = Router();
const {
    createPayment,
    getPayment,
    getPayments,
    updatePayment,
    deletePayment,
    getPaymentsByUser,
    updateStatus,
    getMonthlyReport,
    validarPagoAdministrativo,
    enviarFactura
} = require('../controllers/paymentController.js');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

const multer = require('multer');
// Configurar Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/',  validarJWT, getPayments);
router.get('/monthlyreport',  validarJWT, getMonthlyReport);

router.get('/:id',  validarJWT, getPayment);
router.get('/user/:id', validarJWT, getPaymentsByUser);


router.post('/store', [
    validarJWT,
    check('amount', 'El monto es obligatorio y debe ser número').isNumeric(),
    check('cliente', 'El ID del cliente es necesario').isMongoId(),
    check('referencia', 'La referencia es obligatoria').not().isEmpty(),
    validarCampos
], createPayment);

router.post('/validarpago/:id', [
    validarJWT,
    check('nuevoEstado', 'El estado (APROBADO/RECHAZADO) es obligatorio').not().isEmpty(),
    validarCampos
], validarPagoAdministrativo);

router.delete('/delete/:id',  validarJWT, deletePayment);
router.put('/update/:id',  validarJWT, updatePayment);
router.put('/updatestatus/:id',  validarJWT, updateStatus);

router.post('/enviar_factura', upload.single('facturacliente'), enviarFactura);


module.exports = router;