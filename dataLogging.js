const fs = require('fs');

var logRoomEvent = function(id, ...args) {
  var line = Date.now();
  for(var i in args) {
    var arg = String(args[i]);
    arg.replace('\t', '\\t');
    arg.replace('\n', '\\n');

    line = line + '\t' + args[i]
  }

  var file = getRoomWriteFile(id);

  fs.appendFile(file, line + '\n', function (err) {
    //if (err) throw err;
  });
}

var logUserEvent = function(blid, ...args) {
  //types
  // connection.auth.result <result> <username> <ip> <version>
  // connection.close <message?>
  //
  // room.enter <id>
  // room.message <id> <message>
  // room.leave <id>
  // room.kicked <id> <reason>
  //
  // rooms.banned <duration> <reason>
  var line = Date.now();

  for(var i in args) {
    var arg = String(args[i]);
    arg.replace('\t', '\\t');
    arg.replace('\n', '\\n');

    line = line + '\t' + args[i]
  }

  var file = getUserWriteFile(blid);

  fs.appendFile(file, line + '\n', function (err) {
    //if (err) throw err;
  });
}

var getDateString = function(time = null) {
  var date;
  if(time == null) {
    date = new Date();
  } else {
    date = new Date(time);
  }

  var fy = String(date.getFullYear());
  var mo = String((date.getMonth()+1));
  var da = String(date.getDate());

  if(mo.length == 1) {
    mo = "0" + mo;
  }

  if(da.length == 1) {
    da = "0" + da;
  }

  return fy + "-" + mo + "-" + da;
}

var getRoomWriteFile = function(id, time = null) {
  //gets the appropriate write file based on date
  var dateStr = getDateString(time);

  var folder = __dirname + '/log/room/' + id + '/';
  var file  = folder + dateStr + '.log';

  mkdirp.sync(folder);
  return file;
}

var getUserWriteFile = function(id, time = null) {
  //gets the appropriate write file based on date
  var dateStr = getDateString(time);

  var folder = __dirname + '/log/user/' + id + '/';
  var file  = folder + dateStr + '.log';

  mkdirp.sync(folder);
  return file;
}

const mkdirp = require('mkdirp');

mkdirp.sync(__dirname + '/log/');
try {
  fs.chmodSync(__dirname + '/log/', '0777');
} catch(e) {}

module.exports = {logRoomEvent, logUserEvent};
