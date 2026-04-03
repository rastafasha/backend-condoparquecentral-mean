// Load environment variables FIRST - before any other requires
require('dotenv').config();
const express = require('express');
const { dbConnection } = require('./database/config');
const cors = require('cors');
const path = require('path');
const socketIO = require('socket.io');

const cron = require('node-cron');

// Check if we're running on a serverless platform
const isServerless = process.env.RENDER === '1' || process.env.VERCEL === '1';
const isRender = process.env.RENDER === '1';

// Only require serverless-http if not on traditional server
let serverless;
if (!isServerless || isServerless && process.env.SERVERLESS) {
  serverless = require('serverless-http');
}

//notifications
const webpush = require('web-push');
const bodyParser = require('body-parser');

//crear server de express
const app = express();
const server = require('http').Server(app);


// Initialize socket.io with the server
const allowedOrigins = [
  "http://localhost:4200", // local admin directo
  "http://localhost:4207", // local propietarios
  "http://localhost:4203", // local admin
  "http://127.0.0.1:8080", // local pwa
  "https://admin-condo-pc.vercel.app", // remoto 
  "https://propietarios-corpocapital-pc.vercel.app", // remoto propietarios
];

// Configuración compartida
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones sin origin (como Postman o servidores)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("Origen bloqueado por CORS:", origin); // Esto saldrá en el log de Render
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204
};

// 1. Aplicar a las rutas normales de Express (REST API)

app.use(cors(corsOptions));

// 2. Aplicar a Socket.io
const io = socketIO(server, {
  cors: corsOptions
});
app.use((req, res, next) => {
  req.io = io; // Inyectamos io en la petición
  next();
});

// Export io for use in other modules
module.exports.io = io;

//lectura y parseo del body
app.use(express.json());

// Wrap everything in async function to properly await dbConnection
const startServer = async () => {
  //db
  await dbConnection();

  //directiorio publico de pruebas de google
  app.use(express.static('public'));

  //rutas

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/usuarios', require('./routes/usuarios'));
  app.use('/api/profile', require('./routes/profile'));
  app.use('/api/uploads', require('./routes/uploads'));

  app.use('/api/uploads', require('./routes/uploads'));
  app.use('/api/todo', require('./routes/busquedas'));

  app.use('/api/tipopago', require('./routes/tipopago'));
  app.use('/api/payments', require('./routes/payment'));
  app.use('/api/facturacion', require('./routes/facturacion'));
  app.use('/api/transferencias', require('./routes/transferencia'));
  app.use('/api/tasabcv', require('./routes/tasabcv'));

  app.use('/api/residencias', require('./routes/residencia'));
  app.use('/api/locales', require('./routes/local'));
  app.use('/api/oficinas', require('./routes/oficina'));
  app.use('/api/contactos', require('./routes/contacto'));
 app.use('/api/notificaciones', require('./routes/notificaciones'));
 app.use('/api/notipush', require('./routes/notipush'));
 app.use('/api/comunicados', require('./routes/comunicado'));


  // Se ejecuta el día 1 de cada mes a las 00:00
  cron.schedule('0 0 1 * *', () => {
    console.log('Ejecutando facturación masiva automática...');
    // Aquí llamarías a la lógica de tu función de arriba
  });



  app.use(bodyParser.json());

  //test
  app.get("/", (req, res) => {
    res.json({ message: "Welcome to nodejs." });
  });

  //lo ultimo
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public')); //ruta para produccion, evita perder la ruta
  });

  // Global error handling middleware
  app.use((err, req, res, next) => {
    console.error('Global error handler caught an error:', err);
    res.status(500).json({
      ok: false,
      msg: 'Internal Server Error',
      error: err.message || err.toString()
    });
  });

};

// Start the server
startServer().catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
});

const startApp = async () => {
  try {
    // 1. Forzamos la conexión. Si falla, saltará al catch.
    await dbConnection();

    // 2. Solo después de conectar, abrimos el puerto para Render
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Servidor en puerto: ${PORT}`);
    });
  } catch (error) {
    console.error('Fallo crítico al arrancar:', error);
    process.exit(1);
  }
};

startApp();

// Export for serverless platforms (Vercel)
if (typeof serverless !== 'undefined' && serverless) {
  module.exports.handler = serverless(app);
}

// Export app for testing and other uses
module.exports = { app, server, io };

