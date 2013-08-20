var net = require('net');
var EventEmitter = require('events').EventEmitter;
var utils = require('./utils');
var joinBufferPrependLength = utils.joinBufferPrependLength;
var bufferReadString = utils.bufferReadString;

// agent send to msgCenter [len, msgBody]
// msgCenter send to agent [len[len, senderId][len, msgBody]]
// messageBuff [len, type, body]
const TYPE_USER = 0x01; // send [userId, buff], recv [ senderId, userId, buff]
const TYPE_CHANNEL = 0x02; //send [channelId, buff], recv [senderId, channelId, buff]
const TYPE_AGENT = 0x03; // send [agentId, buff], recv [senderId, agentId, buff]
const TYPE_AGENT_BY_USER = 0x04; // send [userId, buff], recv [senderId, userId, buff]
const TYPE_AGENT_GROUP = 0x05; // send [agentId, buff], recv [senderId, agentId, buff]
const TYPE_REGISTER_USER = 0x11;
const TYPE_REGISTER_GROUP = 0x12;
const TYPE_LENGTH = 2;

function MsgCenter(options) {
    this.port = options.port;
    this.host = options.host;
    this.upstreamPort = options.upstreamPort;
    this.upstreamHost = options.upstreamHost;
    this.server = null;
    this.agents = [];
    this.agentMap = {};
    this.groupToAgents = {};
    this.userToAgentMap = {};
    this.id = '0';
    this.maxAgentId = 0;
}

MsgCenter.prototype = {
    run : function(callback) {
        if(this.upstreamPort) {
            this.connectUpstream();
        }
        this.listen(callback);
    }

  , listen : function(callback) {
        var self = this;
        var server = this.server = net.createServer();
        server.listen(this.port, this.host, callback);
        server.on('connection', function(socket) {
                var id = self.id + (self.maxAgentId++);
                var agent = new AgentConnection(socket, id);
                agent.msgCenter = self;
                self.agents.push(agent);
                self.agentMap[id] = agent;
        });
    }

  , connectUpstream : function() {
        var self = this;
        // var upstreamConnection = this.upstreamConnection = net.createConnection(this.port, this.host);
        // init msgCenterId from upstreamServer
        // TODO
    }
  , sendToUpstream : function() {
        console.log('upstream is not implemented');
    }
  , registerUser: function(userId, agent) {
        this.userToAgentMap[userId] = agent;
    }
  , unregisterUser: function(userId, agent) {
        if(this.userToAgentMap[userId] == agent) {
            delete this.userToAgentMap[userId];
        }
    }
  , registerGroup: function(groupId, agent) {
        (this.groupToAgents[groupId] || (this.groupToAgents[groupId] = [])).push(agent);
    }
  , sendByChannel: function(channelId, buff) {
        this.agents.forEach(function(agent) {
                agent.sendMessage(buff);
        });
        this.sendToUpstream(buff);
    }
  , sendByUser : function(userId, buff) {
        var agent = this.userToAgentMap[userId];
        if(agent) {
            agent.sendMessage(buff);
        } else {
            this.sendToUpstream(buff);
        }
    }
  , sendByAgent: function(agentId, buff) {
        var agent = this.agentMap[agentId];
        if(agent) {
            agent.sendMessage(buff);
        } else {
            this.sendToUpstream(buff);
        }
    }
}

function AgentConnection(socket, id) {
    this.socket = socket;
    this.setId(id);
    this.msgCenter = null;
    utils.parseLenBuff(socket);
    socket.on('message', this.handleMessage.bind(this));
}

AgentConnection.prototype = {

    setId : function(id) {
        this.id = id;
        this.idLength = Buffer.byteLength(id);
        var idBuff = new Buffer(this.idLength + 2);
        idBuff.writeUInt16BE(this.idLength, 0);
        idBuff.write(this.id, 2);
        this.idBuff = idBuff;
    }
  , handleMessage: function(msgBuff) {
        var msgType = msgBuff.readUInt16BE(0);
        var offset = 2;
        switch(msgType) {
          case TYPE_CHANNEL:
            return this.handleChannel(msgBuff, offset);
          case TYPE_USER:
          case TYPE_AGENT_BY_USER:
            return this.handleUser(msgBuff, offset);
          case TYPE_AGENT:
            return this.handleAgent(msgBuff, offset);
          case TYPE_AGENT_GROUP:
            return this.handleAgentGroup(msgBuff, offset);
          case TYPE_REGISTER_USER:
            return this.handleRegisterUser(msgBuff, offset);
          case TYPE_REGISTER_GROUP:
            return this.handleRegisterGroup(msgBuff, offset);
        }
    }
  , handleUser: function(msgBuff, offset) {
        var userId = bufferReadString(msgBuff, offset)[0];
        this.msgCenter.sendByUser(userId, joinBufferPrependLength(this.idBuff, msgBuff));
    }
  , handleChannel: function(msgBuff, offset) {

    }
  , handleAgent: function(msgBuff, offset) {

    }
  , handleAgentGroup: function(msgBuff, offset) {

    }
  , handleRegisterUser: function(msgBuff, offset) {
        var userId = bufferReadString(msgBuff, offset)[0];
        this.msgCenter.registerUser(userId, this);
    }
  , handleRegisterGroup: function(msgBuff, offset) {
        var groupId = bufferReadString(msgBuff, offset)[0];
        this.msgCenter.registerGroup(groupId, this);
    }
  , unregisterUser: function(userId) {
        this.msgCenter.unregisterUser(userId, this);
    }
  , registerChannelUser: function(cid, uid) {

    }
  , sendMessage: function(buff) {
        console.log(buff);
        this.socket.write(buff);
    }
}

function MsgAgentClient(options) {
    EventEmitter.call(this);
    this.port = options.port;
    this.host = options.host;
    this.socket = null;
}

utils.inherits(MsgAgentClient, EventEmitter);

utils.merge(MsgAgentClient.prototype, {
        connect: function(connectListener) {
            var socket = this.socket = new net.Socket();
            socket.connect(this.port, this.host);
            utils.parseLenBuff(socket);
            var self = this;

            socket.on('connect', function() {
                    self.emit('connect');
            });

            socket.on('message', MsgAgentClient.prototype.handleMessage.bind(this));

            socket.on('error', function(err) {
                    console.log(err.message);
                    self.emit('error', err);
            })

            if(connectListener) {
                this.on('connect', connectListener);
            }
        }
      , handleMessage: function(msgBuff) {
            console.log('client receive message', msgBuff);
            var result = bufferReadString(msgBuff, 0);
            var senderId = result[0];
            var offset = result[1];
            var msgType = msgBuff.readUInt16BE(offset);
            offset += 2;
            result = bufferReadString(msgBuff, offset);
            var destId = result[0];
            offset = result[1];
            var msgBody = msgBuff.slice(offset);
            switch(msgType) {
              case TYPE_CHANNEL:
                this.emit('channelMessage', destId, msgBody);
                break;
              case TYPE_USER:
                this.emit('userMessage', destId, msgBody);
                break;
              case TYPE_AGENT_BY_USER:
                this.emit('agentMessageByUser', destId, msgBody);
                break;
              case TYPE_AGENT:
                this.emit('agentMessage', destId, msgBody);
                break;
              case TYPE_AGENT_GROUP:
                this.emit('agentGroupMessage', destId, msgBody);
                break;
            }
        }
      , registerUser: function(userId) {
            this._sendMessage(TYPE_REGISTER_USER, userId);
        }
      , registerAgentToGroup: function(groupId) {
            this._sendMessage(TYPE_REGISTER_GROUP, groupId);
        }
      , sendToUser: function(receiverId, msgBody) {
            this._sendMessage(TYPE_USER, receiverId, msgBody);
        }
      , sendToChannel: function(channelId, msgBody) {
            this._sendMessage(TYPE_CHANNEL, channelId, msgBody);
        }
      , sendToAgentByUser: function(userId, msgBody) {
            this._sendMessage(TYPE_AGENT_BY_USER, userId, msgBody);
        }
      , sendToAgentGroup: function(groupId, msgBody) {
            this._sendMessage(TYPE_AGENT_GROUP, groupId, msgBody);
        }
      , sendToAgent: function(agentId, msgBody) {
            this._sendMessage(TYPE_AGENT, agentId, msgBody);
        }
      , _sendMessage: function(type, id, body) {
            console.log('sending message', type, id, body);
            var idLength = Buffer.byteLength(id);
            var bodyLength = body != null ? (Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body)) : 0;
            var totalLength = idLength + bodyLength + 6;
            var buff = new Buffer(totalLength);
            buff.writeUInt16BE(totalLength - 2, 0);
            buff.writeUInt16BE(type, 2);
            buff.writeUInt16BE(idLength, 4);
            buff.write(id, 6);
            var offset = 6 + idLength;
            if(body != null) {
                if(Buffer.isBuffer(body)) {
                    body.copy(buff, offset);
                } else {
                    buff.write(body, offset);
                }
            }
            this.socket.write(buff);
            return buff;
        }
});

exports.MsgCenter = MsgCenter;
exports.MsgAgentClient = MsgAgentClient;
