var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var {
  nanoid
} = require("nanoid")

//DATABASE
let rooms = {}

app.set('view engine', 'pug')

var port = normalizePort(process.env.PORT || '3000');

app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
  res.render('index', {
    title: 'Hey',
  })
});

app.post('/room', (req, res) => {
  console.log(req.body)
  let roomId = nanoid()
  let auth = nanoid()
  rooms[roomId] = {
    id: roomId,
    name: req.body.name,
    members: {},
    auth: auth
  }
  // startRoomTimer(roomId);
  res.json({
    ...rooms[roomId]
  })
});


app.post('/room/:roomId/match', (req, res) => {
  //todo check auth
  let roomid = req.params.roomId
  let room = rooms[roomid]
  if (!room) {
    return res.status(404).json({
      message: 'Room not found'
    })
  } else {
    if(room.auth != req.body.auth){
      return res.status(401).json({
        message: 'unauthorized'
      })
    }
    let keys = Object.keys(rooms[roomid].members)
    if (keys.length % 2 == 1) {
      return res.status(400).json({
        message: 'Number of pepole should be even.'
      })
    } else {
      let shuffeled = shuffle(keys)
      for (var i = 0; i < shuffeled.length; i = i + 2) {
        let p1 = keys[i]
        let p2 = keys[i + 1]
        console.log(p1, p2, rooms[roomid].members)
        io.to(p1).emit('matched', rooms[roomid].members[p2])
        io.to(p2).emit('matched', rooms[roomid].members[p1])
      }
      return res.status(200).json({
        message: 'Match finished.'
      })
    }
    F
  }
})

function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue, randomIndex;
  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}
app.get('/room/:roomId', (req, res) => {
  let roomId = req.params.roomId
  let room = rooms[roomId]
  console.log(room)
  if (!room) {
    return res.render('room-not-found', {
      roomId: roomId,
    })
  } else {
    return res.render('room', {
      name:room.name
    })
  }
});

function publish_users(roomid) {
  if (rooms[roomid]) {
    io.to(roomid).emit('users', rooms[roomid].members)
  }
}
app.set('port', port);

io.on('connection', (socket) => {

  socket.on('enter-room', (data) => {
    console.log(data)
    console.log('message: from socket' + socket.id + " roomId" + data.roomid + ", name" + data.name);
    if (rooms[data.roomid]) {
      clearTimeout(rooms[data.roomid].selfDestroy)
      rooms[data.roomid].members[socket.id] = {
        name: data.name
      }
      socket.join(data.roomid)
      publish_users(data.roomid)
    }
  });

  socket.on('disconnect', () => {
    for (let roomid of Object.keys(rooms)) {
      console.log(socket.id)
      if (rooms[roomid].members[socket.id]) {
        delete rooms[roomid].members[socket.id];
        if (!Object.keys(rooms[roomid].members).length) {
          console.log('room will be deleted')
          rooms[roomid].selfDestroy = setTimeout(() => {
            console.log('room deleted')
            delete rooms[roomid]
          }, 5000)
        }
        publish_users(roomid)
        break;
      }
    }
  });
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  console.log(err)
  // render the error page
  res.status(err.status || 500).send(err);
});


server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ?
    'Pipe ' + port :
    'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string' ?
    'pipe ' + addr :
    'port ' + addr.port;
  console.log('Listening on ' + bind);

}

module.exports = app;