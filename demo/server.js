// var msgcenter = require('../msgcenter');

// msgcenter.run({
//         port: 5555
//       , host: '127.0.0.1'
//       , upstreamPort: 6666
//       , upstreamHost: '127.0.0.1'
// });

var MsgCenter = require('../msgcenter').MsgCenter;

var options = {
    port: 5555
  , host: '127.0.0.1'
  , upstreamPort: 6666
  , upstreamHost: '127.0.0.1'
};
var msgcenter = new MsgCenter(options);

msgcenter.run(function(){
        console.log('server running at ', options.port);
});
