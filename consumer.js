// serverA.js
const express = require('express');
const jwt = require('jsonwebtoken');
const amqp = require('amqplib');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your_secret_key';

// Middleware để phân tích body
app.use(express.json());

app.post('/authenticate', (req, res) => {
    const { username, password } = req.body; // Giả lập xác thực

    // Kiểm tra thông tin người dùng (giả lập)
    if (username === 'user' && password === 'password') {
        const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
        return res.json({ token });
    }
    return res.status(401).json({ message: 'Invalid credentials' });
});

const startAMQPServer = async () => {
    const connection = await amqp.connect('amqp://guest:1234@localhost:5672');
    const channel = await connection.createChannel();
    const queue = 'auth_queue';

    await channel.assertQueue(queue);
    channel.consume(queue, async (msg) => {
        const { username, password } = JSON.parse(msg.content.toString());
        
        // Gọi API xác thực
        const response = await fetch(`http://localhost:${PORT}/authenticate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(data)), {
            correlationId: msg.properties.correlationId,
        });
        channel.ack(msg);
    });
};

app.listen(PORT, () => {
    console.log(`Server A running at http://localhost:${PORT}`);
});

startAMQPServer();