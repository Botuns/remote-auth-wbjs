const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { Client,RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const {Server} = require('socket.io');
const http = require('http');
const server = http.createServer(app);
let store;
const MONGODB_URI = 'mongodb+srv://dolapoabdulqahar:dolapoabdulqahar@whatsapp.01vtdq7.mongodb.net/?retryWrites=true&w=majority';
const io = new Server(server,{
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
})
app.use(bodyParser.json());
mongoose.connect(MONGODB_URI).then(() => {
    console.log('Connected to database');
     store = new MongoStore({ mongoose: mongoose });
    //  console.log(store);
    
});

// Store user sessions


app.listen(4000, () => {
  console.log('API server started on port ');
});
server.listen(3001, () => {
    console.log('Socket server started on port ');
});
const allsessions = {}; 
const createWhatsappSession = async (id,socket) => {
    const client = new Client({
        puppeteer: {
            headless: false,
        },
        authStrategy: new RemoteAuth({
            clientId: id,
            store: store,
            backupSyncIntervalMs: 300000
        })
    });
    client.on('qr', (qr) => {
        // Generate and scan this code with your phone
        console.log('QR RECEIVED', {qr});
        socket.emit('qr',{qr});
    });
    client.on('authenticated', (session) => {
        console.log('AUTHENTICATED', session);
        // store.saveSession(session);
    })
    client.on('ready', () => {
        console.log('READY');
        allsessions[id] = client;
        socket.emit('ready',{id,message:'client is ready'});
    });
    client.on('remote_session_saved',()=>{
        console.log('remote-session saved');
        socket.emit('remote_session_saved',{
            message:'remote session saved'
        });
    })
    

    client.initialize();
}
const getWhatsappSession = async (id,socket) => {
    const client = new Client({
        puppeteer: {
            headless: false,
        },
        authStrategy: new RemoteAuth({
            clientId: id,
            store: store,
            backupSyncIntervalMs: 300000
        })
    });
    client.on('ready', () => {
        console.log('wa-client is READY');
    })
    socket.emit('ready',{
        id,
        message:'client is ready'
    });
    client.on('qr', (qr) => {
        // Generate and scan this code with your phone
        console.log('QR RECEIVED', {qr});
        socket.emit('qr',{qr,message:'QR RECEIVED when logged out'});
    });
    client.initialize();
};
io.on('connection', (socket) => {
    console.log('Socket connected', socket?.id);
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on('getsession', (data) => {
        console.log('getsession',data);
        const {id} = data;
        getWhatsappSession(id,socket);
    });
    socket.on('connected', (data) => {
        console.log('connected to the server',data);
        socket.eit('hello','hello from the server');
    });
    socket.on('createSession',(data)=>{
        console.log('creating session',data);
        const {id} = data;
        createWhatsappSession(id,socket);
    })
    socket.on('getAllChats',async (data)=>{
        console.log('getting all chats',data);
        const {id} = data;
        const client = allsessions[id];
        const chats = await client.getChats();
        socket.emit('allChats',{chats});
    })
});