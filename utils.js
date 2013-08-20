exports.parseLenBuff = function (socket, encoding) {

  var waiting = 0
    , buf
    , bufOffset
    ;

  function parseData(data, offset) {
    var len = data.length;
    var left = len - offset;
    if(waiting) {
      var toRead = Math.min(left, waiting);
      if(waiting <= left) {
        data.copy(buf, bufOffset, offset, offset + waiting);
        offset += waiting;
        waiting = 0;
        if(encoding) {
            socket.emit('message', buf.toString(encoding));
        } else {
            socket.emit('message', buf);
        }
        if (offset < len) {
          parseData(data, offset);
        }
      } else {
        data.copy(buf, bufOffset, offset, len);
        waiting -= (len - offset);
      }
    } else {
      waiting = data.readUInt16BE(offset);
      buf = new Buffer(waiting);
      // UINT length is 2
      parseData(data, offset + 2)
    }
  }

  socket.on('data', function(data) {
      parseData(data, 0);
  })
}

exports.sendBufferMessage = function(socket, buffMsg) {
    var len = buffMsg.length;
    var buff = new Buffer(2 + len);
    buff.writeUInt16BE(len, 0);
    buffMsg.copy(buff, 2);
    socket.write(buff);
}

exports.sendStringMessage = function(socket, buffStr) {
    var len = Buffer.byteLength(buffStr);
    var buff = new Buffer(2 + len);
    buff.writeUInt16BE(len, 0);
    buff.write(buffStr, 2);
    socket.write(buff);
}

exports.joinBufferPrependLength = function() {
    var totalLength = 0;
    for(var i = 0; i < arguments.length; i++) {
        var v = arguments[i];
        totalLength += Buffer.isBuffer(v) ? v.length : Buffer.byteLength(v);
    }
    var buff = new Buffer(2 + totalLength);
    buff.writeUInt16BE(totalLength, 0);
    var offset = 2;
    for(var i = 0; i < arguments.length; i++) {
        var v = arguments[i];
        if(Buffer.isBuffer(v)) {
            v.copy(buff, offset);
            offset += v.length;
        } else {
            buff.write(v, offset);
            offset += Buffer.byteLength(v);
        }
    }
    return buff;
}

// read len string
exports.bufferReadString = function(buff, offset) {
    var len = buff.readUInt16BE(offset);
    var str = buff.toString('utf8', offset+=2, offset+=len);
    return [str, offset];
}

exports.merge = function(dest, src) {
    for(var name in src) {
        dest[name] = src[name];
    }
    return dest;
}

var util = require('util');
exports.merge(exports, util);
