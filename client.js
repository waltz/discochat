// Inject a console logger so as to not upset browsers that don't have this functionality.
if (!window.console) { console = {}; console.log = function() {} }

var playlist = new Array;
var player;

function onYouTubePlayerAPIReady() {
    // player = new YT.Player('player', {
    //     videoId: 'skKJNmW1czw',
    //     playerVars: { 'controls': 0 },
    //     events: { 'onStateChange': onStateChange }
    // });
}

function onStateChange(state) {
    console.log("Video state changed: " + state);
    if (state == YT.PlayerState.ENDED) {
        console.log("Video play ended, grabbing the next video.");
        var new_video_id = playlist.pop;
        updatePlaylist();
        player.loadVideoById(new_video_id);
    }
}

function updatePlaylist() {
    $("#playlist").text(playlist.toString());
}

// The bulk of the client business gets handled in here.
$(function() {
    $('.default_value').each(function() {
        var default_value = this.value;
        $(this).focus(function() {
            if(this.value == default_value) {
                this.value = '';
            }
        });
        $(this).blur(function() {
            if(this.value == '') {
                this.value = default_value;
            }
        });
    });

    // When the user picks a username, connect to the server.
    $("#get_a_username").submit(function(event) {
        event.preventDefault();
        
        var username = $("#username").val();

        socket = new io.Socket(document.location.hostname, { port: document.location.port, rememberTransport: false });
        socket.connect();

        // Set the username on connect.
        socket.on('connect', function() {
            socket.send({ 'setUsername': username });
            $("#username_select").fadeOut('fast');
            $("#room_container").fadeIn('fast');
        });

        // Handle chat messages.
        socket.on('message', function(data) {
            // Build up the element and inject the text to take advantage
            // of some HTML escaping goodness.
            data = jQuery.parseJSON(data);
            var element = $("<li></li>");
            element.hide();

            // Route to different actions based on message type.
            if (data.hasOwnProperty("message")) {
                element.append("<span class=\"username\">" + data["message"]["username"] + "</span>");
                element.append(data["message"]["text"]);
                $("#message_list").append(element);
                $("#message_list").scrollTop(1000000);
                element.fadeIn('fast');
            } else if (data.hasOwnProperty("announcement")) {
                element.addClass("announcement");
                element.text(data["announcement"]["text"]);     
                $("#message_list").append(element);
                $("#message_list").scrollTop(1000000);
                element.fadeIn('fast');
            } else if (data.hasOwnProperty("videos")) {
                console.log(data["videos"][0]);
                playlist.unshift(data["videos"][0]);
                updatePlaylist();
            } else {
                console.log("Caught an unroutable message!");
                console.log(data);
            }                                
        });

        // Bind to the form submit and send the message to the server.
        $("#chat").submit(function(event) {
            event.preventDefault();
            var field = $("#message");
            var message = field.val();
            field.val("");

            // Does the message text have a youtube link?
            var regex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
            var match;
            var video_ids = new Array;

            while (match = regex.exec(message)) {
                var url = match[0];
                if (url.indexOf("youtube") > 0) {
                    var youtube_id_matcher = /^.*((v\/)|(embed\/)|(watch\?))\??v?=?([^\&\?]*).*/;
                    var id = youtube_id_matcher.exec(url);
                    if (id != null) {
                        video_ids.push(id[5]);
                    }
                }
            }

            if (socket.disconnected) {
                socket.connect()
            }
            
            // Send the video ids.
            if (video_ids.length > 0) {
                socket.send({ 'videos': video_ids });
            }

            socket.send({ 'message': message });
            return false;
        });

        return false;
    });
});
