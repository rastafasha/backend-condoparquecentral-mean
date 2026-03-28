/*
 Ruta: /api/oficinas
 */

const { Router } = require('express');
const router = Router();
const {
    getOficinas,
    crearOficina,
    actualizarOficina,
    borrarOficina,
    getOficina,
    find_by_name,
} = require('../controllers/oficinaController');

const { validarJWT } = require('../middlewares/validar-jwt');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validar-campos');

router.get('/', getOficinas);
router.get('/:id', getOficina);

router.post('/crear', [
    validarJWT,
    check('nombre', 'El nombre del Oficina es necesario').not().isEmpty(),
    validarCampos
], crearOficina);

router.put('/editar/:id', [
    validarJWT,
    check('nombre', 'El nombre del Oficina es necesario').not().isEmpty(),
    validarCampos
], actualizarOficina);

router.delete('/borrar/:id', validarJWT, borrarOficina);




router.get('/category_by_nombre/:nombre', find_by_name);


module.exports = router;