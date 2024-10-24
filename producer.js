// serverB.js
const amqp = require('amqplib');

const sendAuthenticationRequest = async (username, password) => {
    const connection = await amqp.connect('amqp://guest:1234@localhost:5672');
    const channel = await connection.createChannel();
    const queue = 'auth_queue';

    const { queue: responseQueue } = await channel.assertQueue('', { exclusive: true });
    const correlationId = generateUuid();
    console.log({responseQueue})

    channel.sendToQueue(queue, Buffer.from(JSON.stringify({ username, password })), {
        replyTo: responseQueue,
        correlationId: correlationId,
    });

    channel.consume(responseQueue, (msg) => {
        if (msg.properties.correlationId === correlationId) {
            const response = JSON.parse(msg.content.toString());
            console.log('Received response:', response);
            channel.close();
            connection.close();
        }
    });
};

const generateUuid = () => {
    return Math.random().toString() + Math.random().toString() + Math.random().toString();
};

// Gửi yêu cầu xác thực
sendAuthenticationRequest('user', 'password');