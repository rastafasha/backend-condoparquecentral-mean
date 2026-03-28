const fs = require('fs');
const Profile = require('../models/profile');
const Payment = require('../models/payment');
const Facturacion = require('../models/facturacion');
const borrarImagen = (path) => {

    if (fs.existsSync(path)) {
        //borrar la imagen anterior
        fs.unlinkSync(path);
    }
}

const actualizarImagen = async(tipo, id, nombreArchivo) => {

    let pathViejo = '';

    switch (tipo) {

        case 'profiles':
            const profile = await Profile.findById(id);
            if (!profile) {
                console.log('No es un profile por id');
                return false;
            }
            pathViejo = `./uploads/profiles/${profile.img}`;

            borrarImagen(pathViejo);

            profile.img = nombreArchivo;
            await profile.save();
            return true;
            break;

         case 'payments':
            const payment = await Payment.findById(id);
            if (!payment) {
                console.log('No es un payment por id');
                return false;
            }
            pathViejo = `./uploads/payments/${payment.img}`;

            borrarImagen(pathViejo);

            payment.img = nombreArchivo;
            await payment.save();
            return true;
            break;
         case 'facturas':
            const factura = await Facturacion.findById(id);
            if (!factura) {
                console.log('No es una factura por id');
                return false;
            }
            pathViejo = `./uploads/facturas/${factura.img}`;

            borrarImagen(pathViejo);

            factura.img = nombreArchivo;
            await factura.save();
            return true;
            break;



    }

};

module.exports = {
    actualizarImagen,
    borrarImagen
};