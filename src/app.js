const express = require('express');

const userRoutes = require('./modules/user/user.controller');
const orderRoutes = require('./modules/order/order.controller');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);

app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

module.exports = app;
