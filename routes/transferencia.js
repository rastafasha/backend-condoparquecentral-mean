/*
 Ruta: /api/transferencias
 */

 const { Router } = require('express');
 const router = Router();
 const {
    getTransferencias,
    crearTransferencia,
    actualizarTransferencia,
    borrarTransferencia,
    getTransferencia,
    listarPorUsuario,
    updateStatus,
    listarPorStatus
 } = require('../controllers/transferenciaController');
 const { validarJWT } = require('../middlewares/validar-jwt');
 const { check } = require('express-validator');
 const { validarCampos } = require('../middlewares/validar-campos');
 
 router.get('/', getTransferencias);
 router.get('/:id', getTransferencia);
 router.get('/user/:id', listarPorUsuario);
 router.get('/status/:status', listarPorStatus);
 
 router.post('/store', crearTransferencia);
 
 router.put('/update/:id', [
     validarJWT,
     check('type', 'El type es necesario').not().isEmpty(),
     validarCampos
 ], actualizarTransferencia);

 router.put('/statusupdate/:id', updateStatus);
 
 router.delete('/remove/:id', validarJWT, borrarTransferencia);

 
 
 
 
 module.exports = router;