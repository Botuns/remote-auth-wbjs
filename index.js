const express = require('express');
const app = express();
const fs = require('fs');
const bodyParser = require('body-parser');
const { Client,RemoteAuth,MessageMedia,LegacySessionAuth  } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const {Server} = require('socket.io');
const http = require('http');
const cors = require('cors')
const server = http.createServer(app);
app.use(cors())
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });
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
const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionCfg = require(SESSION_FILE_PATH);
}
const createWhatsappSession = async (id,socket) => {
    const client = new Client({
        puppeteer: {
            headless: true,
        },
        authStrategy: new LegacySessionAuth({
            session: sessionCfg,
            clientID: id,



        })
        // authStrategy: new RemoteAuth({
        //     clientId: id,
        //     store: store,
        //     backupSyncIntervalMs: 300000
        // })
    });
    client.on('qr', (qr) => {
        // Generate and scan this code with your phone
        console.log('QR RECEIVED', {qr});
        socket.emit('qr',{qr});
    });
    client.on('authenticated', (session) => {
        console.log('AUTHENTICATED', session);
        // store.saveSession(session);
        sessionCfg = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
        if (err) {
            console.error(err);
        }
    });
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
const SendWaMessage = async (id,socket,numbers,message,mediaPath) => {
    const client = new Client({
        puppeteer: {
            headless: true,
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
    // client.on('qr', (qr) => {
    //     // Generate and scan this code with your phone
    //     console.log('QR RECEIVED', {qr});
    //     socket.emit('qr',{qr,message:'QR RECEIVED when logged out'});
    // });
    try {
        const { numbers, message, mediaPath } = req.body;
        let mediaOptions = {};
        if (mediaPath) {
          mediaOptions = {
            caption: 'This is a media caption',
            media: MessageMedia.fromFilePath(mediaPath)
          };
        }
    
        const messages = await Promise.all(numbers.map(async number => {
          const msg = await client.sendMessage(`${number}@c.us`, message, mediaOptions);

          return msg;
        }));
         socket.emit('sendMessageSuccess', { message: 'Message sent successfully' });
        res.send({ messages });
      } catch (error) {
        // next(error);
        socket.emit('sendMessageError', { message: 'Error sending message' });
      }
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
    socket.on('createSession', (data) => {
        console.log('creating session for a user', data);
        const { id } = data;
        createWhatsappSession(id, socket)
          .then(() => {
            const successMessage = "Session created successfully";
            socket.emit('sessionCreated', { message: successMessage });
          })
          .catch((error) => {
            const errorMessage = "Failed to create session";
            socket.emit('sessionCreationFailed', { message: errorMessage });
          });
      });
      
    
    socket.on('getAllChats',async (data)=>{
        console.log('getting all chats',data);
        const {id} = data;
        const client = allsessions[id];
        const chats = await client.getChats();
        socket.emit('allChats',{chats});
    })
    socket.on('sendMessage', async (data) => {
        console.log('sending message', data);
        const { id, number, message,mediaPath } = data;
        const client = allsessions[id];

        let mediaOptions = {};
        if (mediaPath) {
            mediaOptions = {
                caption: 'This is a media caption',
                media: MessageMedia.fromFilePath(mediaPath)
            };
        }
        const chats = await client.getChats();
        console.log('chats',chats);
        console.log('data',data);
        const messages = await Promise.all(number.map(async number => {

            const msg = await client.sendMessage(`${number}@c.us`, message, mediaOptions);
        }))
        socket.emit('sendMessageSuccess', { message: 'Message sent successfully',msg:messages });

        
        
        // SendWaMessage(id, socket, numbers, message, mediaPath)
        //   .then(() => {
        //     const successMessage = "message sent successfully";
        //     socket.emit('sessionCreated', { message: successMessage });
        //   })
        //   .catch((error) => {
        //     const errorMessage = "Failed to send message";
        //     socket.emit('mesage sent failed', { message: errorMessage });
        //   });
      });
});
