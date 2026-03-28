var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TransferenciaSchema = Schema({
    user: { type: Schema.ObjectId, ref: 'user' },
    metodo_pago: { type: Schema.ObjectId, ref: 'paymentmethod' },
    bankName: { type: String, required: true },
    amount: { type: String, required: true },
    referencia: { type: String, required: true },
    name_person: {type: String, required: true},
    phone: {type: String, required: true},
    status: { type: String, required: true, default: 'pending' },
    local: { type: Schema.ObjectId, ref: 'tienda' , default: null},
    paymentday: { type: Date, default: Date.now, required: false },
    createdAt: { type: Date, default: Date.now, required: true },
    updatedAt: { type: Date }
});

TransferenciaSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.updatedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('transferencia', TransferenciaSchema);
