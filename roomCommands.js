const EventEmitter = require('events');
const moment = require('moment');

const clientConnection = require('./clientConnection');

class RoomCommands extends EventEmitter {}

global.startTime = moment();

var newCommandSet = function(room) {
  var commandSet = new RoomCommands();
  commandSet.room = room;

  commandSet.on('help', (client, args) => {
    var command = {};
    command['help'] = "Shows available commands";
    command['warnings'] = "Shows how many temporary warnings you have";
    command['rules'] = "Shows the rules";
    command['motd'] = "Prints room's message of the day";
    command['uptime'] = "How long the Live server has been online";
    command['time'] = "The server's local time";
    command['seticon'] = "<icon>\tSets your icon";
    command['getid'] = "<username...>\tReturns BLID of user";
    var pubCmdCt = Object.keys(command).length;

    if(client.isMod) {
      command['announce'] = "<message...>\tBroadcasts a message in all rooms";

      command['setmotd'] = "<motd...>\tSets the room's MOTD";

      command['mute'] = "<duration> <username...>\tMutes user for the duration";
      command['muteid'] = "<duration> <blid>\tMutes user for the duration";

      command['kick'] = "<username...>\tKicks user from room";
      command['kickid'] = "<blid>\tKicks user from room";

      command['ban'] = "<duration> <username...>\tBans user from all rooms";
      command['banid'] = "<duration> <blid>\tBans user from all rooms";

      command['barid'] = "<duration> <blid>\tBans user from Glass Live";

      command['resetperm'] = "<username...>\tResets user's permissions";
      command['resetpermid'] = "<blid>\tResets user's permissions";

      command['resetwarnings'] = "Resets your warnings";

      command['glassUpdate'] = "<version>\tNotifies clients a update is available";
    }

    var msg = "<color:444444><br>Public Commands:";
    var i = 0;
    for(cmd in command) {
      if(msg != "")
        msg = msg + '<br>';

      if(i == pubCmdCt) {
        msg = msg + '<br>Mod Commands:<br>';
      }
      i++;

      msg = msg + "<color:e74c3c>/" + cmd;
      if(command[cmd].indexOf('\t') > -1) {
        var field = command[cmd].split('\t');
        msg = msg + " " + field[0] + " <color:555555>" + field[1];
      } else {
        msg = msg + " <color:555555>" + command[cmd];
      }
    }

    client.sendObject({
      type: 'roomText',
      id: room.id,
      text: msg
    });
  });

  commandSet.on('rules', (client, args) => {
    var rules = [
      "Be respectful.",
      "No spamming.",
      "Don't type in all caps.",
      "No derogatory/discriminatory words or statements."
    ]

    var str = "<br>Rules:";
    for(i in rules) {
      str = str + "<br>" + rules[i];
    }

    client.sendObject({
      type: 'roomText',
      id: room.id,
      text: str
    });
  });

  commandSet.on('motd', (client, args) => {
    client.sendObject({
      type: 'roomText',
      id: room.id,
      text: " * MOTD: " + room.persist.motd
    });
  });

  commandSet.on('uptime', (client, args) => {
    var seconds = moment().diff(global.startTime, 'seconds');
    var minutes = Math.floor(seconds/60);
    var hours = Math.floor(minutes/60);
    var days = Math.floor(hours/24);

    seconds = seconds % 60;
    minutes = minutes % 60;
    hours = hours % 24;

    str = "";
    if(days > 0) {
      str += " " + days + "d";
    }

    if(hours > 0) {
      str += " " + hours + "h";
    }

    if(minutes > 0) {
      str += " " + minutes + "m";
    }

    if(seconds > 0) {
      str += " " + seconds + "s";
    }

    str = str.trim();
    client.sendObject({
      type: 'roomText',
      id: room.id,
      text: " * Uptime: " + str
    });
  });

  commandSet.on('time', (client, args) => {
    client.sendObject({
      type: 'roomText',
      id: room.id,
      text: " * Local Time: " + moment().format('h:mm:ss a')
    });
  });

  commandSet.on('seticon', (client, args) => {
    var str = args.join(' ');
    str.trim();
    client.setIcon(str);
  });

  commandSet.on('getid', (client, args) => {

    var cl = room.findClientByName(args.join(' '));
    if(cl != false) {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * ' + cl.username + '\'s BL_ID is ' + cl.blid
      });
    } else {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * Unable to find user "' + args.join(' ') + '"'
      });
    }
  })

  commandSet.on('ping', (client, args) => {
    if(!client.isMod) return;

    client.sendObject({
      type: 'error',
      message: "pong! " + args.join(' '),
      showDialog: true
    });
  });

  commandSet.on('mute', (client, args) => {
    if(!client.isMod) return;

    var duration = parseInt(args[0]);
    args.splice(0, 1);

    if(duration <= 0 || duration == NaN)
      return; //inavlid

    var cl = room.findClientByName(args.join(' '));
    if(cl != false) {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * Muted ' + cl.username + ' for ' + duration + ' seconds'
      });

      cl.setTempPerm('rooms_talk', false, duration, "You're muted!");

      room.sendObject({
        type: 'roomText',
        id: room.id,
        text: "<color:e74c3c> * " + client.username + " has muted " + cl.username + " (" + cl.blid + ") for " + duration + " seconds"
      })

      cl._notifyIconChange("sound_mute");

      setTimeout(function() {
        cl._notifyIconChange();
        cl.sendObject({
          type: 'roomText',
          id: room.id,
          text: ' * Your mute has expired'
        })
      }, duration*1000);

    } else {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * Unable to find user "' + args.join(' ') + '"'
      });
    }
  })

  commandSet.on('muteid', (client, args) => {
    if(!client.isMod) return;

    var duration = parseInt(args[0]);

    if(duration <= 0 || duration == NaN)
      return; //inavlid

    if(args.length != 2) {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * Format: /muteid <duration> <blid>'
      });
      return;
    }

    var cl = clientConnection.getFromBlid(args[1])
    if(cl != false) {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: '<color:e74c3c> * Muted ' + cl.username + ' for ' + duration + ' seconds'
      });

      cl.setTempPerm('rooms_talk', false, duration, "You're muted!");

      room.sendObject({
        type: 'roomText',
        id: room.id,
        text: " * " + client.username + " has muted " + cl.username + " (" + cl.blid + ") for " + duration + " seconds"
      })

      cl._notifyIconChange("sound_mute");

      setTimeout(function() {
        cl._notifyIconChange();
        cl.sendObject({
          type: 'roomText',
          id: room.id,
          text: ' * Your mute has expired'
        })
      }, duration*1000);

    } else {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * Unable to find blid "' + args[1] + '"'
      });
    }
  })

  commandSet.on('kick', (client, args) => {
    if(!client.isMod) return;

    var cl = room.findClientByName(args.join(' '));
    if(cl != false) {

      cl.setTempPerm('rooms_join', false, 1000, "You've been kicked!");

      room.sendObject({
        type: 'roomText',
        id: room.id,
        text: "<color:e74c3c> * " + client.username + " kicked " + cl.username + " (" + cl.blid + ")"
      })

      cl.kick();
    } else {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * Unable to find user "' + args.join(' ') + '"'
      });
    }
  })

  commandSet.on('kickid', (client, args) => {
    if(!client.isMod) return;

    var cl = clientConnection.getFromBlid(args[0])
    if(cl != false) {

      cl.setTempPerm('rooms_join', false, 1000, "You've been kicked!");

      room.sendObject({
        type: 'roomText',
        id: room.id,
        text: "<color:e74c3c> * " + client.username + " kicked " + cl.username + " (" + cl.blid + ")"
      })

      cl.kick();
    } else {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * Unable to find blid "' + args[0] + '"'
      });
    }
  })

  commandSet.on('banid', (client, args) => {
    if(!client.isMod) return;

    var duration = parseInt(args[0]);

    if(duration <= 0 || duration == NaN)
      return; //inavlid

    if(args.length < 2) {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * Format: /banid <duration> <blid> [reason...]'
      });
      return;
    }

    var reason = args.slice(2).join(' ');
    reason.trim();

    if(reason == "")
      reason = "You're banned!";

    var cl = clientConnection.getFromBlid(args[1])
    if(cl != false) {

      cl.setTempPerm('rooms_join', false, duration, reason);

      room.sendObject({
        type: 'roomText',
        id: room.id,
        text: "<color:e74c3c> * " + client.username + " banned " + cl.username + " (" + cl.blid + ") from public rooms for " + duration + " seconds"
      })

      cl.roomBan(duration, reason);
    } else {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * Unable to find blid "' + args[1] + '"'
      });
    }
  })

  commandSet.on('barid', (client, args) => {
    if(!client.isMod) return;

    var duration = parseInt(args[0]);

    if(duration <= 0 || duration == NaN)
      return; //inavlid

    if(args.length < 2) {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * Format: /barid <duration> <blid> [reason...]'
      });
      return;
    }

    var reason = args.slice(2).join(' ');
    reason.trim();

    if(reason == "")
      reason = "You're barred!";

    var cl = clientConnection.getFromBlid(args[1])
    if(cl != false) {

      cl.setTempPerm('service_use', false, duration, reason);

      room.sendObject({
        type: 'roomText',
        id: room.id,
        text: "<color:e74c3c> * " + client.username + " barred " + cl.username + " (" + cl.blid + ") from Glass Live for " + duration + " seconds"
      })

      cl.bar(duration, reason);
    } else {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * Unable to find blid "' + args[1] + '"'
      });
    }
  })

  commandSet.on('setmotd', (client, args) => {
    if(!client.isMod) return;

    room.setMOTD(args.join(' '));
    room.sendObject({
      type: 'roomText',
      id: room.id,
      text: "* " + client.username + " has set the MOTD to " + args.join(' ')
    })
  });

  commandSet.on('announce', (client, args) => {
    if(!client.isMod) return;

    if(args.length == 0)
      return;

    var msg = '<color:54d98c> * ' + args.join(' ');

    var rooms = require('./chatRoom').getAll();
    for(i in rooms) {
      var room = rooms[i];
      room.sendObject({
        type: 'roomText',
        id: room.id,
        text: msg
      })
    }
  });

  commandSet.on('resetperm', (client, args) => {
    if(!client.isMod)
      return;

    var cl = room.findClientByName(args.join(' '));
    if(cl != false) {
      cl.persist.permissions = {};
      cl.persist.tempPermissions = {};
      if(cl._permissionSet != null) {
        cl._permissionSet.perms = {};
        cl._permissionSet.temp = {};
      }
      cl.savePersist();

      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * Reset permissions for ' + cl.username
      });
    } else {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: '* Unable to find user "' + args.join(' ') + '"'
      });
    }
  })

  commandSet.on('resetpermid', (client, args) => {
    if(!client.isMod)
      return;

    var blid = args[0];
    var cl = clientConnection.getFromBlid(args[0]);
    if(cl == false) {
      var Database = require('./database');
      Database.getUserData(blid, function(data, err) {
        if(err != null) {
          client.sendObject({
            type: 'roomText',
            id: room.id,
            text: '* Error updating user data for blid "' + blid + '"'
          });
          return;
        }

        data.permissions = {};
        data.tempPermissions = {};
        Database.saveUserData(blid, data);
        client.sendObject({
          type: 'roomText',
          id: room.id,
          text: ' * Reset permissions for ' + data.username + ' (offline)'
        });
      });
    } else {
      cl.resetPermissions();
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * Reset permissions for ' + cl.username
      });
    }
  })

  commandSet.on('warnings', (client, args) => {
    var warnings = 0;
    if(client.persist.warnings != null)
      warnings = client.persist.warnings;

    client.sendObject({
      type: 'roomText',
      id: room.id,
      text: ' * You have ' + warnings + ' ' + (warnings == 1 ? 'warning' : 'warnings')
    });
  });

  commandSet.on('resetwarnings', (client, args) => {
    if(!client.isMod)
      return;

    client.persist.warnings = 0;
    client.savePersist();

    client.sendObject({
      type: 'roomText',
      id: room.id,
      text: ' * Your warnings have been reset'
    });
  });

  commandSet.on('glassupdate', (client, args) => {
    if(!client.isMod)
      return;

    if(args.length != 1) {
      client.sendObject({
        type: 'roomText',
        id: room.id,
        text: ' * Format: /glassUpdate <version>'
      });
      return;
    }

    clientConnection.sendObjectAll({
      type: 'glassUpdate',
      version: args[0]
    });
  });

  return commandSet;
}

module.exports = {newCommandSet};
