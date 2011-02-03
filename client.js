if (!window.console) { console = {}; console.log = function() {} }

// The bulk of the client business gets handled in here.
$(function() {
    socket = new io.Socket(null, { port: 8002, rememberTransport: false });
    socket.connect();

    // Handle chat messages.
    socket.on('message', function(data) {
        // Build up the element and inject the text to take advantage
        // of some HTML escaping goodness.
        console.log(data);

        var element = $("<li></li>");
        element.text(data);
        $("#message_list").append(element);
    });

    // Bind to the form submit and send the message to the server.
    $("#chat").submit(function(event) {
        event.preventDefault();
        var field = $("#message");
        var message = field.val();
        field.val("");
        
        // if (socket.disconnected) {
        //     socket.connect()
        // }

        socket.send(message);
        return false;
    });
});
