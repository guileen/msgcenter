var MsgAgentClient = require('../msgcenter').MsgAgentClient;

// var agent = msgagent.connect({
//         port: 5555
//       , host: '127.0.0.1'
// });
var agent = new MsgAgentClient({
        port: 5555
      , host: '127.0.0.1'
});

agent.connect(function(){
        console.log('connect to the host');
});

var processId = process.argv[2];

// agent.registerAgentForKey('pid' + processId);
agent.registerAgentToGroup('admin');

for(var i = 0; i < 100; i ++) {
    var uid = processId + '-' + i;
    agent.registerUser(uid);
    if(i % 2 == 0) {
        // agent.registerUserToChannel(uid, 'c' + Math.floor(i/10));
    }
}

agent.on('channelMessage', function(channelId, usersOfHere, buff, fromAgentId) {
        var str = buff.toString();
        console.log('channelMessage', channelId, usersOfHere, buff);
        if(str == 'hello') {
            usersOfHere.forEach(function(userId) {
                    agent.sendToChannel(channelId, 'str' + userId + ' - ' + str);
            });
        }
});

agent.on('userMessage', function(userId, buff, fromAgentId) {
        var str = buff.toString();
        console.log('userMessage', userId, str);
});

agent.on('agentMessage', function(buff, fromAgentId) {
        var str = buff.toString();
        console.log('agentMessage', str);
        if(str == 'hello') {
            agent.sendToAgent(fromAgentId, 'reply-' + str);
        }
});

agent.on('agentGroupMessage', function(agentGroupId, buff, fromAgentId) {
        var str = buff.toString();
        console.log('agentGroupMessage', str);
});

if(processId == '1') {
    agent.sendToChannel('c0', 'hello');
    agent.sendToUser('2-1', 'hello user 2-1');
    agent.sendToAgentByUser('2-1', 'hello');
}
