var ignored = require('./ignore/stuff')
var twilio = require("./node_modules/twilio/lib");
var express = require('express');
var parser = require('body-parser');
var app = express();
var server = require('http').createServer(app),
    io = require('socket.io').listen(server);
    
var distance = require('google-distance');
app.use(parser.urlencoded({extended : false}))

var accountSid = ignored.accountSid // Your Account SID from www.twilio.com/console
var authToken = ignored.authToken // Your Auth Token from www.twilio.com/console
var phoneNos = ignored.phoneNos  

var twilio = require('twilio');
var client = new twilio.RestClient(accountSid, authToken);

var minDurSoc = [];
var item = {};
var minDuration = '999'
var globalScoket = {} ;

var socObj = {};

var peopleArray = {} ;

const TWO_MINUTES = 1000 * 60 * 2 ;
const ONE_MINUTE = 1000 * 60 * 1 ;

server.listen(3000,function(){
    console.log('server running on 3000');

    io.sockets.on('connection' , function(socket){
        globalScoket = socket;
        globalScoket.on('location' , function(data){ // when ambulances send location
                if(!!peopleArray[data.forMobile]){
                    var currtime = new Date();
                    if(peopleArray[data.forMobile].finishtime <= currtime.getTime()){
                        var longLatObj = peopleArray[data.forMobile] ;
                        var arr = splitStringArray(data.longLatOfAmbulance);
                        var dur = getDuration(longLatObj.oglong , longLatObj.oglat , arr[0] , arr[1]);
                        peopleArray[data.forMobile].ambulances.push({'id':socket.id , 'duration': dur});
                        var socs = peopleArray[data.forMobile].ambulances ;
                        if(socs.size() != 0){
                            for (var i in socs){
                                if(socs[i].duration < minDuration) {
                                    minDuration = socs[i].duration
                                    item = {};
                                    item["id"] = socs[i].id
                                    item["duration"] = socs[i].duration
                                }
                            }
                            io.to(item.id).emit('desco' , {'oglong' : longLatObj.oglong , 'oglat' : longLatObj.oglat});
                            sendMessageWithBody(data.forMobile,'You will see an ambulance soon')
                        }
                    } 
                }
          
        });// when ambulances send location
     
    }); // io socket connection ends
});

    app.post('/message' , function(req , res) {
        var msgFrom = req.body.From;
        var msgBody = req.body.Body;
        var decodedmsg = decodebase64(msgBody);
        var splitStringArray = splitString(decodedmsg);
        if(splitStringArray[1] != 'defaultString') {
            sendMessage(splitStringArray[1] , splitStringArray[0]);
            sendMessage(splitStringArray[2] , splitStringArray[0]);
            sendMessage(splitStringArray[3] , splitStringArray[0]);
        }
        var ploc = { oglong : splitStringArray[4] , oglat : splitStringArray[5]};
        peopleArray[msgFrom] = ploc ;
        peopleArray[msgFrom].ambulances = []; 
        var currtime = new Date();
        peopleArray[msgFrom].finishtime = currtime.getTime() + ONE_MINUTE ; 
        globalScoket.emit("sendloc", {code:"emergency",forMobile:msgFrom} );
        res.send(`
            <Response>
                <Message>We will Update you on ambulance availaility in a minute, Please wait</Message>
            </Response>
        `);

        var timerFunction = function(msgFromNumber){
            var socs = peopleArray[msgFromNumber].ambulances ;
            if(socs.size() == 0){
                 sendMessageWithBody(msgFromNumber,'No ambulances found Sorry')                    
            }; 
        };
        setTimeout(timerFunction(msgFrom), TWO_MINUTES) ;

    });


function sendMessage(toNum , from) {
    client.messages.create({
        body: from + ' met with an accident',
        to: toNum,  // Text this number
        from: '+16122236429' // From a valid Twilio number
        }, function(err, message) {
            if(err){
                console.log(err.message);   
        }
    });
}

function sendMessageWithBody(toNum , body) {
    client.messages.create({
        body: 'Ambulance service: '+body,
        to: toNum,  // Text this number
        from: '+16122236429' // From a valid Twilio number
        }, function(err, message) {
            if(err){
                console.log(err.message);   
        }
    });
}

function decodebase64(base64) {
    var b = new Buffer(base64, 'base64')
    var s = b.toString();
    console.log(s);
    return s;
}

function splitString(str) {
    var arr = str.split(",");
    return arr;
}

function getDuration(olong , olat , dlong , dlat) {
    var duration;
    distance.get({
    origin: olong + ','+ olat,
    destination: dlong+','+ dlat
  },
  function(err, data) {
    if (err) return console.log(err);
    console.log(data.distance);
    console.log(data.duration);
    duration = data.duration;   
  });
    return duration;
}