(function(){
    var app = angular.module("app");
    app.factory('websocketService', function() {

        var RTCPeerConnection = null,
            getUserMedia = null,
            attachMediaStream = null,
            reattachMediaStream = null,
            webrtcDetectedBrowser = null,
            webrtcDetectedVersion = null;


        function trace(text) {
            // This function is used for logging.
            if (text[text.length - 1] == '\n') {
                text = text.substring(0, text.length - 1);
            }
            //console.log((performance.now() / 1000).toFixed(3) + ": " + text);
        }
        function maybeFixConfiguration(pcConfig) {
            if (pcConfig == null) {
                return;
            }
            for (var i = 0; i < pcConfig.iceServers.length; i++) {
                if (pcConfig.iceServers[i].hasOwnProperty('urls')){
                    pcConfig.iceServers[i]['url'] = pcConfig.iceServers[i]['urls'];
                    delete pcConfig.iceServers[i]['urls'];
                }
            }
        }
        function setOptions() {
            if (navigator.mozGetUserMedia) {
                console.log("This appears to be Firefox");

                webrtcDetectedBrowser = "firefox";

                webrtcDetectedVersion =
                    parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);

                // The RTCPeerConnection object.
                RTCPeerConnection = function(pcConfig, pcConstraints) {
                    // .urls is not supported in FF yet.
                    maybeFixConfiguration(pcConfig);
                    return new mozRTCPeerConnection(pcConfig, pcConstraints);
                };

                //The RTCSessionDescription object.
                RTCSessionDescription = mozRTCSessionDescription;

                // The RTCIceCandidate object.
                RTCIceCandidate = mozRTCIceCandidate;

                // Get UserMedia (only difference is the prefix).
                // Code from Adam Barth.
                getUserMedia = navigator.mozGetUserMedia.bind(navigator);
                navigator.getUserMedia = getUserMedia;

                // Creates iceServer from the url for FF.
                createIceServer = function(url, username, password) {
                    var iceServer = null;
                    var url_parts = url.split(':');
                    if (url_parts[0].indexOf('stun') === 0) {
                        // Create iceServer with stun url.
                        iceServer = { 'url': url };
                    } else if (url_parts[0].indexOf('turn') === 0) {
                        if (webrtcDetectedVersion < 27) {
                            // Create iceServer with turn url.
                            // Ignore the transport parameter from TURN url for FF version <=27.
                            var turn_url_parts = url.split("?");
                            // Return null for createIceServer if transport=tcp.
                            if (turn_url_parts.length === 1 ||
                                turn_url_parts[1].indexOf('transport=udp') === 0) {
                                iceServer = {'url': turn_url_parts[0],
                                    'credential': password,
                                    'username': username};
                            }
                        } else {
                            // FF 27 and above supports transport parameters in TURN url,
                            // So passing in the full url to create iceServer.
                            iceServer = {'url': url,
                                'credential': password,
                                'username': username};
                        }
                    }
                    return iceServer;
                };

                createIceServers = function(urls, username, password) {
                    var iceServers = [];
                    // Use .url for FireFox.
                    for (i = 0; i < urls.length; i++) {
                        var iceServer = createIceServer(urls[i],
                            username,
                            password);
                        if (iceServer !== null) {
                            iceServers.push(iceServer);
                        }
                    }
                    return iceServers;
                };

                // Attach a media stream to an element.
                attachMediaStream = function(element, stream) {
                    console.log("Attaching media stream");
                    element.mozSrcObject = stream;
                    element.play();
                };

                reattachMediaStream = function(to, from) {
                    console.log("Reattaching media stream");
                    to.mozSrcObject = from.mozSrcObject;
                    to.play();
                };

                // Fake get{Video,Audio}Tracks
                if (!MediaStream.prototype.getVideoTracks) {
                    MediaStream.prototype.getVideoTracks = function() {
                        return [];
                    };
                }

                if (!MediaStream.prototype.getAudioTracks) {
                    MediaStream.prototype.getAudioTracks = function() {
                        return [];
                    };
                }
            } else if (navigator.webkitGetUserMedia) {
                console.log("This appears to be Chrome");

                webrtcDetectedBrowser = "chrome";
                webrtcDetectedVersion =
                    parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10);

                // Creates iceServer from the url for Chrome M33 and earlier.
                createIceServer = function(url, username, password) {
                    var iceServer = null;
                    var url_parts = url.split(':');
                    if (url_parts[0].indexOf('stun') === 0) {
                        // Create iceServer with stun url.
                        iceServer = { 'url': url };
                    } else if (url_parts[0].indexOf('turn') === 0) {
                        // Chrome M28 & above uses below TURN format.
                        iceServer = {'url': url,
                            'credential': password,
                            'username': username};
                    }
                    return iceServer;
                };

                // Creates iceServers from the urls for Chrome M34 and above.
                createIceServers = function(urls, username, password) {
                    var iceServers = [];
                    if (webrtcDetectedVersion >= 34) {
                        // .urls is supported since Chrome M34.
                        iceServers = {'urls': urls,
                            'credential': password,
                            'username': username };
                    } else {
                        for (i = 0; i < urls.length; i++) {
                            var iceServer = createIceServer(urls[i],
                                username,
                                password);
                            if (iceServer !== null) {
                                iceServers.push(iceServer);
                            }
                        }
                    }
                    return iceServers;
                };

                // The RTCPeerConnection object.
                RTCPeerConnection = function(pcConfig, pcConstraints) {
                    // .urls is supported since Chrome M34.
                    if (webrtcDetectedVersion < 34) {
                        maybeFixConfiguration(pcConfig);
                    }
                    return new webkitRTCPeerConnection(pcConfig, pcConstraints);
                };

                // Get UserMedia (only difference is the prefix).
                // Code from Adam Barth.
                getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
                navigator.getUserMedia = getUserMedia;

                // Attach a media stream to an element.
                attachMediaStream = function(element, stream) {
                    if (typeof element.srcObject !== 'undefined') {
                        element.srcObject = stream;
                    } else if (typeof element.mozSrcObject !== 'undefined') {
                        element.mozSrcObject = stream;
                    } else if (typeof element.src !== 'undefined') {
                        element.src = URL.createObjectURL(stream);
                    } else {
                        console.log('Error attaching stream to element.');
                    }
                };

                reattachMediaStream = function(to, from) {
                    to.src = from.src;
                };
            } else {
                console.log("Browser does not appear to be WebRTC-capable");
            }

        }
        setOptions();

        function RTC() {
            this.ws = null;
            this.options = { audio: true, video: true };
            this.recorder = { connection: null, local: [], remote: [], stream: null };
            this.receiver = { connection: null, local: [], remote: [], stream: null };
            this.servers = null;
            this.tmp = [];
            this.isHost = false;
            this.timeout = null;
        }

        RTC.prototype.init = function(room) {

            var self = this;

            if (self.ws !== null)
                self.ws.close();

            self.ws = new WebSocket('ws://' + window.location.href.replace(window.location.protocol, '') + '?room=' + room);

            self.ws.onmessage = function (e) {

                var obj = JSON.parse(decodeURIComponent(e.data));

                console.log('websocket --->', obj);

                switch (obj.type) {

                    case 'start-host':
                    case 'start-client':

                        self.isHost = obj.type === 'start-host';

                        setTimeout(function() {
                            self.send();
                        }, 2000);

                        break;

                    case 'sdp':
                    case 'candidate':

                        // recorder to receiver
                        if (obj.from === 'receiver')
                            self.recorder.remote.push(obj);
                        else
                            self.receiver.remote.push(obj);

                        clearTimeout(self.timeout);
                        self.timeout = setTimeout(function() {
                            self.flush();
                        }, 2000);

                        break;
                }
            };

            return self;
        };

        RTC.prototype.start = function(room) {

            var self = this;

            self.recorder.connection = new RTCPeerConnection(self.servers);
            self.receiver.connection = new RTCPeerConnection(self.servers);

            self.recorder.connection.onicecandidate = function(e) {
                if (!e.candidate)
                    return;
                self.recorder.local.push({ type: 'candidate', from: 'recorder', data: e.candidate });
            };

            self.receiver.connection.onicecandidate = function(e) {
                if (!e.candidate)
                    return;
                self.receiver.local.push({ type: 'candidate', from: 'receiver', data: e.candidate });
            };

            self.receiver.connection.onaddstream = function(e) {
                console.log('RECEIVER STREAM');
                self.receiver.stream = e.stream;
                attachMediaStream(vid2, e.stream);
            };

            self.recorder.connection.onaddstream = function(e) {
                console.log('RECORDER STREAM');
                self.receiver.stream = e.stream;
                attachMediaStream(vid2, e.stream);
            };

            getUserMedia(self.options, function(stream) {
                self.recorder.stream = stream;
                self.recorder.connection.addStream(self.recorder.stream);

                self.recorder.connection.createOffer(function(desc) {
                    self.recorder.connection.setLocalDescription(desc);
                    self.recorder.local.push({ type: 'sdp', from: 'recorder', desc: 'offer', data: desc });
                }, onError, { 'mandatory': { 'OfferToReceiveAudio': self.options.audio, 'OfferToReceiveVideo': self.options.video }});

                attachMediaStream(vid1, stream);
                self.init(room);
            }, noop);

            console.log('START');
            return self;

        };

        RTC.prototype.send = function(force) {

            var self = this;

            if (!force) {
                self.tmp = self.tmp.concat(self.recorder.local, self.receiver.local);
                self.recorder.local = [];
                self.receiver.local = [];
                self.send(true);
                return;
            }

            var item = self.tmp.shift();

            if (typeof(item) === 'undefined')
                return;

            self.ws.send(encodeURIComponent(JSON.stringify(item)));

            setTimeout(function() {
                self.send(true);
            }, 500);

            return self;
        };

        RTC.prototype.flush = function() {

            var self = this;

            console.log('FLUSH');

            self.recorder.remote.forEach(function(obj) {

                switch (obj.type) {

                    case 'sdp':
                        console.log('recorder.connection.setRemoteDescription');
                        self.recorder.connection.setRemoteDescription(new RTCSessionDescription(obj.data));
                        break;

                    case 'candidate':
                        // možno hlúpos?
                        console.log('recorder.connection.addIceCandidate');
                        self.recorder.connection.addIceCandidate(new RTCIceCandidate(obj.data), onSuccess, onError);
                        break;
                }
            });

            self.receiver.remote.forEach(function(obj) {
                switch (obj.type) {

                    case 'sdp':

                        console.log('receiver.connection.setRemoteDescription');
                        self.receiver.connection.setRemoteDescription(new RTCSessionDescription(obj.data));
                        self.receiver.connection.createAnswer(function(desc) {

                            console.log('CREATE ANSWER');
                            self.receiver.connection.setLocalDescription(desc);
                            self.receiver.local.push({ type: 'sdp', from: 'receiver', desc: 'answer', data: desc });

                            setTimeout(function() {
                                self.send();
                            }, 3000);

                        }, onError, { 'mandatory': { 'OfferToReceiveAudio': self.options.audio, 'OfferToReceiveVideo': self.options.video }});

                        break;

                    case 'candidate':
                        console.log('receiver.connection.addIceCandidate');
                        self.receiver.connection.addIceCandidate(new RTCIceCandidate(obj.data), onSuccess, onError);
                        break;
                }
            });

            self.receiver.remote = [];
            self.recorder.remote = [];

            return self;

        };

        function onSuccess(e) {
            console.log('SUCCESS', e);
        }

        function onError(e) {
            console.log('ERROR', e);
        }

        function noop(){}

        return {
            RTC: RTC
        };
    });
}());
