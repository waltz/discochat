
PORT = 8002;
HOST = '127.0.0.1';

var staticHandler = require('./staticHandler'),
    sys           = require('sys'),
    http          = require('http'),
    url           = require('url'),
    io            = require('./vendor/socket.io'),
    util          = require('util'),
    redis         = require('./vendor/node_redis');

var redisSubscribe = redis.createClient(),
    redisPublish   = redis.createClient(),  
    redisStorage   = redis.createClient();

send404 = function(response) {
    response.writeHead(404);
    response.write('404');
    response.end();
}

setUsername = function(sessionId, username) {
    redisStorage.set(sessionId, username);
}

getUsername = function(sessionId) {
    redisStorage.get(sessionId);
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
    case "/styles.css":
        var handler = staticHandler.serve('./styles.css');
        handler(request, response);
        break;
    case "/client.js":
        var handler = staticHandler.serve('./client.js');
        handler(request, response);
        break;
    case "/jquery.cookie.js":
        var handler = staticHandler.serve('./vendor/jquery.cookie.js');
        handler(request, response);
        break;
    default:
        send404(response);
    }

});
server.listen(PORT, HOST);

// Let socket.io hook into the server.
var socket = io.listen(server);

// Monitor the subscription connection and route messages to their clients.
redisSubscribe.subscribe("chat");
redisSubscribe.on("message", function(channel, message) {
    var object = JSON.parse(message);
    util.log("Got a message on channel: " + channel);
    util.log(util.inspect(object));
    socket.broadcast(message);
});

// Monitor the socket for connections.
socket.on('connection', function(client) {
    // Handle and route messages.
    // Messages are always in the form of '{ commandType: payload }'
    client.on('message', function(data) {
        if ('setUsername' in data) {
            util.log(util.inspect(data.setUsername));
            redisStorage.set(client.sessionId, data.setUsername, function(err, res) {
                redisPublish.publish("chat",
                                     JSON.stringify({ "announcement": { "text": data["setUsername"] + " has joined" }})
                );
            });
        }
        else if ('message' in data) {
            redisStorage.get(client.sessionId, function(things) { util.log(util.inspect(things)); });

            redisStorage.get(client.sessionId, function(err, res) {
                redisPublish.publish("chat",
                                     JSON.stringify({ "message": { "username": res, "text": data["message"] }})
                );
            });
        }
        else if ('videos' in data) {
            redisPublish.publish("chat", JSON.stringify(data));
        }
        else {
            util.log("No route found for incoming data!");
        }
    });

    client.on('disconnect', function(data) {
        redisPublish.publish("chat", JSON.stringify({ "announcement": { "text": getUsername(client.sessionId) + " has left." }}));
    });
});

util.log("Server at http://" + HOST + ':' + PORT.toString() + '/');

