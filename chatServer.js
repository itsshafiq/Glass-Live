const net = require('net');
const EventEmitter = require('events');

const logger = require('./logger');

const ClientConnection = require('./clientConnection');

var start = function() {
  if(module.listening) return;

  module.chatServer = net.createServer(function(socket) {
    socket.clientConnection = ClientConnection.createNew(socket);
    socket.on('data', (raw) => {
      var rawStr = raw.toString().trim();
      var lines = rawStr.split('\n');
      for(var i in lines) {
        var line = lines[i];
        if(line.trim() == "")
          continue;

        try {
          var obj = JSON.parse(line);
          if(obj.type == null) {
            logger.error("Received invalid call from client", line);
          } else if(socket.clientConnection instanceof EventEmitter) {
            if(!socket.clientConnection.emit(obj.type, obj)) {
              logger.log('Attempted to emit ' + obj.type + ' but no handler was found');
            }
          }
        } catch(e) {
          console.error(e);
          logger.error("Error receiving call from client", line);
        }
      }
    });

    socket.on('error', (error) => {

    });

    socket.on('close', () => {
      if(socket.clientConnection != null) {
        socket.clientConnection.onDisconnect();
      }
    });

    socket.on('end', () => {
      if(socket.clientConnection != null) {
        socket.clientConnection.onDisconnect();
      }
    });
  });

  var port = require('./config.json').port;

  module.chatServer.listen(port);
  module.listening = true;
  logger.log("Listening on port " + (port));
}

var shutdown = function() {
  if(module.chatServer != null && module.chatServer.listening) {
    module.chatServer.close(function(err) {
      logger.log("No longer listening...");
    })
  }
}

module.exports = {start, shutdown};
