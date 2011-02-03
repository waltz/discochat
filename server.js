PORT = 8002;
HOST = '127.0.0.1';

var staticHandler = require('./staticHandler'),
    sys           = require('sys'),
    http          = require('http'),
    url           = require('url'),
io            = require('./vendor/socket.io'),
util          = require('util');

send404 = function(response) {
    response.writeHead(404);
    response.write('404');
    response.end();
}

// Handle static files yeahhh.
var server = http.createServer(function(request, response) {
    var path = url.parse(request.url)['pathname'];
    util.log("Recieved a request for: " + path);

    switch(path) {
    case "/":
        var handler = staticHandler.serve('./index.html');
        handler(request, response);
        break;
    case "/client.js":
        var handler = staticHandler.serve('./client.js');
        handler(request, response);
        break;
    default:
        send404(response);
    }

});
server.listen(PORT, HOST);

// Let socket.io hook into the server.
var socket = io.listen(server);
socket.on('connection', function(client) {
    socket.broadcast("welcome " + client.sessionId + "!");

    client.on('message', function(data) {
        socket.broadcast(data);
        util.log('Recieved a message: ' + util.inspect(data));
    });

    client.on('disconnect', function(data) {
        util.log("Client disconnected.");
        socket.broadcast("see ya later " + client.sessionId + "!");
    });

});

util.log("Server at http://" + HOST + ':' + PORT.toString() + '/');

