var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/webrtcserver';
var socketsArray = Array();

mongoose.connect(mongodbUri, function(err) {
    if (err) {
        console.log('Error in connecting to database: ' + err);
    } else {
        console.log('Successfully connected to database: ' + mongodbUri);
    }
});

var userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    socketId: {
        type: String
    },
    password: {
        type: String,
        required: true
    },
    status: {
        type: String
    }
});
var User = mongoose.model("User", userSchema);


var candidateSchema = new mongoose.Schema({
    to: { type: String, required: true },
    from: { type: String, required: true },
    sdp: { type: String, required: true },
    sdpMid: { type: String, required: true },
    sdpMLineIndex: { type: Number, required: true }
});
var Candidate = mongoose.model("Candidate", candidateSchema);

var forceSSL = function() {
    return function(req, res, next) {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(
                ['https://', req.get('Host'), req.url].join('')
            );
        }
        next();
    }
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static(__dirname + '/dist'));
app.use(forceSSL());

io.on('connection', function(socket) {
    console.log('A user connected with id: ' + socket.id);
    socketsArray.push(socket);

    socket.on('candidate', function(data, callback) {
        console.log('Got candidate from:%j', data);

        User.findOne({ email: data.to }, function(err, user) {
            if (err) {
                console.log('Error in sending candidate: ' + err);
                callback(false);
            } else {
                if (user) {
                    if (user.status == 'busy') {
                        //User is on this call. So its safe to send candidates
                        //io.to(user.socketId).emit('candidate', data);

                        console.log(user.email + ' is ready to receive candidates so sending.');
                        for (var i = 0; i < socketsArray.length; i++) {
                            if (socketsArray[i].id == user.socketId) {
                                socketsArray[i].emit('candidate', data);
                                callback(true);
                                console.log('candidate sent successfully');
                                break;
                            }
                        }
                    } else {
                        //User has not reached the video chat screen yet. So cant send candidates now
                        console.log(user.email + ' is not ready to receive candidates so saving.');
                        var candidate = new Candidate({
                            to: data.to,
                            from: data.from,
                            sdp: data.sdp,
                            sdpMid: data.sdpMid,
                            sdpMLineIndex: data.sdpMLineIndex
                        });
                        candidate.save(function(err) {
                            if (err) {
                                console.log('Error in saving candidate: ' + err);
                                callback(false);
                            } else {
                                console.log('Candidate saved successfully.');
                                callback(true);
                            }
                        });
                    }

                } else {
                    console.log('user not found for sending candidate');
                    callback(false);
                }
            }
        });
    });

    socket.on('event_give_me_candidates', function(data) {
        console.log('User requesting for candidate where to:' + data.to + ' and from: ' + data.from);
        Candidate.find({ from: data.from, to: data.to }, function(err, candidates) {
            if (err) {
                console.log('Error in finding candidates: ' + err);
            } else {
                if (candidates) {
                    for (var i = 0; i < candidates.length; i++) {
                        socket.emit('candidate', candidates[i]);
                        console.log('Candidate ' + (i + 1) + ' sent successfully');
                    }
                } else {
                    console.log('Did not find any candidates');
                }
            }
        });
    });

    socket.on('event_end_call', function(data) {
        console.log('User requested to end call from:' + data.from + ' to:' + data.to);
        Candidate.remove({ from: data.from, to: data.to }, function(err) {
            if (err) {
                console.log('Error in deleting candidate: ' + err);
            } else {
                console.log('Candidate deleted successfully');
            }
        });
    });

    socket.on('disconnect', function() {
        socketsArray.splice(socketsArray.indexOf(socket), 1);
        console.log('User disconnected with id ' + socket.id);
        User.findOne({ socketId: socket.id }, function(err, user) {
            if (err) {
                console.log('Offline event not sent: ' + err);
            } else {
                if (user) {
                    user.status = 'offline';
                    user.socketId = '';
                    user.save(function(err) {
                        if (err) {
                            console.log('Error in changing user status: ' + err);
                        } else {
                            console.log('User status changed to offline');
                            socket.broadcast.emit('user_offline', { email: user.email });
                        }
                    })
                } else {
                    console.log('Error with socket id: ' + socket.id);
                }
            }

        });
    });

    socket.on('get_users_list', function(data, callback) {
        User.find({
            email: {
                $ne: data.email
            }
        }, 'email status socketId', function(err, users) {
            if (err) {
                console.log('Error in fetching users: ' + err);
                callback(null);
            } else {
                console.log('Found %d users', users.length);
                callback(users);
            }
        });
    });

    socket.on('user_online', function(data, callback) {
        console.log('Got user online event: ' + data.email);
        User.findOne({
            email: data.email
        }, function(err, user) {
            if (err) {
                console.log('Error in changing user status: ' + err);
                callback(false);
            } else {
                if (user) {
                    user.status = 'online';
                    user.socketId = socket.id;
                    user.save(function(err) {
                        if (err) {
                            console.log('Error in saving user status: ' + err);
                            callback(false);
                        } else {
                            console.log('User status online: ' + data.email);
                            socket.broadcast.emit('user_online', data);
                            callback(true);
                        }
                    });
                } else {
                    console.log('user not found for changing status: ' + data.email);
                    callback(false);
                }
            }
        });
    });

    socket.on('user_offline', function(data, callback) {
        console.log('Got user offline event');
        User.findOne({
            email: data.email
        }, function(err, user) {
            if (err) {
                callback(null);
                console.log('Error in user offline: ' + err);
            } else {
                if (user) {
                    user.status = 'offline';
                    user.save(function(err) {
                        if (err) {
                            callback(null);
                            console.log('Error in user offline: ' + err);
                        } else {
                            callback(data);
                            socket.broadcast.emit('user_offline', data);
                        }
                    });
                } else {
                    console.log('User not found: ' + data);
                    callback(null);
                }
            }
        });
    });

    socket.on('event_busy', function(data, callback) {
        console.log('user called busy event: ' + data.email);
        User.findOne({ email: data.email }, function(err, user) {
            if (err) {
                console.log('Error in finding user for marking him busy: ' + err);
                callback(false);
            } else {
                if (user) {
                    console.log('User found for making busy');
                    user.status = 'busy';
                    user.save(function(err) {
                        if (err) {
                            console.log('Error in making user busy: ' + err);
                            callback(false);
                        } else {
                            console.log('User marked busy successfully.');
                            callback(true);
                        }
                    })
                } else {
                    console.log('No user found with the given email.');
                    callback(false);
                }
            }
        });
    });

    socket.on('answer', function(data, callback) {
        console.log('Got answer: %j', data);
        User.findOne({
            email: data.to
        }, 'socketId', function(err, user) {
            if (err) {
                console.log('Error in sending answer: ' + err);
                callback(false);
            } else {
                if (user) {
                    //io.to(user.socketId).emit('answer', data);
                    for (var i = 0; i < socketsArray.length; i++) {
                        if (socketsArray[i].id == user.socketId) {
                            socketsArray[i].emit('answer', data);
                            console.log('answer sent to caller:' + data.to);
                            callback(true);
                        }
                    }

                } else {
                    console.log('User not found for sending answer');
                    callback(false);
                }
            }
        });
    });

    socket.on('offer', function(data, callback) {
        console.log('Got offer: %j', data);
        User.findOne({ email: data.to }, function(err, user) {
            if (err) {
                console.log('Error in sending offer: ' + err);
                callback(false);
            } else {
                if (user) {
                    //io.to(user.socketId).emit('offer', data);
                    for (var i = 0; i < socketsArray.length; i++) {
                        if (socketsArray[i].id == user.socketId) {
                            socketsArray[i].emit('offer', data);
                            console.log('offer sent to receiver: ' + user.email);
                            callback(true);
                        }
                    }

                } else {
                    console.log('User not found for sending offer');
                    callback(false);
                }
            }
        });
    });


    socket.on('update_socket_id', function(data, callback) {
        console.log(data.email + ' requested to update his socket id.');
        User.findOne({ email: data.email }, function(err, user) {
            if (err) {
                console.log('Error in finding user for updating socket it: ' + err);
                callback(false);
            } else {
                console.log('Changing id from ' + user.socketId + ' to ' + socket.id);
                user.socketId = socket.id;
                user.save(function(err) {
                    if (err) {
                        console.log('Error in updating socket id: ' + err);
                        callback(false);
                    } else {
                        console.log('Socket id updated successfully');
                        callback(true);
                    }
                });
            }
        });
    });
});

app.get('/*', function(req, res) {
    res.sendFile(path.join(__dirname + '/dist/index.html'));
});

app.post('/login', function(req, res) {
    console.log('User trying to login with email:' + req.body.email + ' and password:' + req.body.password);
    User.findOne({
        email: req.body.email,
        password: req.body.password
    }, function(err, user) {
        if (err) {
            console.log('Error in searching user: ' + err);
            return res.json({
                success: false,
                data: 'Something went wrong. Please try again.'
            });
        } else {
            if (user) {
                console.log(user.email + ' logged in.');
                return res.json({
                    success: true,
                    data: user.email
                });
            } else {
                return res.json({
                    success: false,
                    data: 'Invalid username or password.'
                });
            }
        }
    });
});

app.post('/signup', function(req, res) {
    var user = new User({
        email: req.body.email,
        password: req.body.password,
        socketId: '',
        status: 'offline'
    });

    user.save(function(err) {
        if (err) {
            console.log('Error in creating user: ' + err);
            return res.json({
                success: false,
                data: 'Something went wrong. Please try again.'
            });
        } else {
            console.log('User created successfully: ' + user.email);
            io.emit('user_joined', user);
            return res.json({
                success: true,
                data: 'Account created successfully.'
            });
        }
    });
});

http.listen(port, function(err) {
    if (err) {
        console.log('Error in starting server: ' + err);
    } else {
        console.log('Server started successfully on port: ' + port);
    }
});