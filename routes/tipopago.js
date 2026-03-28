/*
 Ruta: /api/tipopago
 */

const { Router } = require('express');
const router = Router();
const {
    getPaymentMethods,
    crearPaymentMethod,
    actualizarPaymentMethod,
    borrarPaymentMethod,
    getPaymentMethod,
    updateStatus,
    getPaymentMethodName,
    listar_active,
} = require('../controllers/tipopagoController');
const { validarJWT } = require('../middlewares/validar-jwt');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getPaymentMethods);
router.get('/actives', listar_active);
router.get('/:id', getPaymentMethod);
router.get('/name/:tipo', getPaymentMethodName);

router.post('/store', [
    validarJWT,
    validarCampos
], crearPaymentMethod);

router.put('/update/:id', [
    validarJWT,
    validarCampos
], actualizarPaymentMethod);

router.delete('/remove/:id', borrarPaymentMethod);

router.put('/statusupdate/:id', updateStatus);
 

module.exports = router;