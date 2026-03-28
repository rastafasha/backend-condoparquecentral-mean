# TODO: Seeders Progress (Full Chain)

## Completed Seeders:
- [x] usuarioSeeder.js: 3 users
- [x] residenciasSeeder.js: 7 residencias
- [x] facturacionSeeder.js: 9 facturas
- [x] paymentsSeeder.js: 12 payments
- [x] **profileSeeder.js: 3 profiles** (Super: solo residencia | Admin: oficina | User: residencia+local)

## Run Order:
```
node seeders/usuarioSeeder.js
node seeders/residenciasSeeder.js
node seeders/profileSeeder.js
node seeders/facturacionSeeder.js
node seeders/paymentsSeeder.js
```

## Test:
- `/api/profile`
- `/api/payments`
- `/api/facturacion`

**+ transferenciasSeeder.js: 6 Paymentmethods + 12 transferencias**

Run: `node seeders/transferenciasSeeder.js`

**All seeders complete!**
