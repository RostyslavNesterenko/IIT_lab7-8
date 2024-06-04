import process from 'node:process';
import TelegramBot from 'node-telegram-bot-api';
import {FluentClient} from '@fluent-org/logger';
import {collectDefaultMetrics, Counter, Registry} from 'prom-client';
import express from 'express';



const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const FLUENTD_HOST = process.env.FLUENTD_HOST;
const FLUENTD_PORT = process.env.FLUENTD_PORT;
const SERVER_PORT = process.env.SERVER_PORT;


const bot = new TelegramBot(TELEGRAM_TOKEN, {polling: true});
const logger = new FluentClient('lab7-8', {
    socket: {
        host: FLUENTD_HOST, port: FLUENTD_PORT, timeout: 3000, // 3 seconds
    }
});
const server = express();
const register = new Registry();
collectDefaultMetrics({register});


server.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        await logger.emit("error", {error});
        res.status(500).end('Something went wrong');
    }
});

server.listen(SERVER_PORT, async (error) => {
    if (error) {
        await logger.emit("error", {error});
        process.exit(1)
    } else {
        console.log(`Web server is started on port: ${SERVER_PORT}`);
    }
});


const logCounter = new Counter({
    name: 'logged_messages_number',
    help: 'the_number_of_logged_messages',
    registers: [register]
});


bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    try {
        const text = msg.text;
        const content = {username: msg.from.username, message: text};
        await logger.emit('log', content);
        logCounter.inc();
        const resText = `Message => ${text} <=were successfully logged `;
        bot.sendMessage(chatId, resText);
    } catch (e) {
        bot.sendMessage(chatId, 'Something went wrong');
    }
});
