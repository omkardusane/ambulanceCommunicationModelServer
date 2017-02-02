
var twilio = require("./node_modules/twilio/lib");
var express = require('express');
var parser = require('body-parser');
var app = express();
var server = require('http').createServer(app),
    io = require('socket.io').listen(server);    
var distance = require('google-distance');
var events = require('events');
var sizeof = require('object-sizeof');
app.use(parser.urlencoded({extended : false}))
var accountSid = ignored.accountSid // Your Account SID from www.twilio.com/console
var authToken = ignored.authToken // Your Auth Token from www.twilio.com/console
var phoneNos = ignored.phoneNos 

var twilio = require('twilio');
var client = new twilio.RestClient(accountSid, authToken);
var eventEmitter = new events.EventEmitter();

var msgFrom , msgBody
var minDurSoc = [];
var item = {};
var minDuration = '999'
var globalScoket = {} ;

var socObj = {};

var peopleArray = {} ;

const TWO_MINUTES = 120000 ;
const ONE_MINUTE = 60000 ;

server.listen(3000,function(){
    console.log('server running on 3000');

    io.sockets.on('connection' , function(socket){
        console.log("Client Connected");
        eventEmitter.on('emitForLoc' , function(data) {
            console.log(data);
            io.sockets.emit('sendloc' , data);
        });
        
        socket.on('location' , function(data){ // when ambulances send location
                
            if(!!peopleArray[data.forMobile]){
                    var currtime = new Date();
                    if(peopleArray[data.forMobile].finishtime <= currtime.getTime()){
                        
                        var latLongObj = peopleArray[data.forMobile] ;
                        
                        var arr = splitStringArray(data.latLongOfAmbulance);
                        var dur = getDuration(latLongObj.oglat , latLongObj.oglong , arr[0] , arr[1]);
                        
                        peopleArray[data.forMobile].ambulances.push({'id':socket.id , 'duration': dur});
                    }
                    else{   
                         var socs = peopleArray[data.forMobile].ambulances ;
                         if(sizeof(socs) != 0){
                            for (var i in socs){
                                if(socs[i].duration < minDuration) {
                                    minDuration = socs[i].duration
                                    item = {};
                                    item["id"] = socs[i].id
                                    item["duration"] = socs[i].duration
                                }
                            }
                            io.to(item.id).emit('desco' , {'oglat' : latLongObj.oglat , 'oglong' : latLongObj.oglong});
                            sendMessageWithBody(data.forMobile,'You will see an ambulance soon')
                        }
                    } 
                }
          
        });// when ambulances send location
     
    }); // io socket connection ends
});

app.post('/sms' , function(req , res) {
        
        msgFrom = req.body.From;
        msgBody = req.body.Body;
        
        //var decodedmsg = decodebase64(msgBody);
        var splitStringArray = splitString(msgBody);//splitString(decodedmsg);
        if(splitStringArray[2] != 'defaultString') {
            sendMessage(splitStringArray[2] , splitStringArray[1]);
            //sendMessage(splitStringArray[3] , splitStringArray[1]);
            //sendMessage(splitStringArray[4] , splitStringArray[1]);
        }
        
        var ploc = { oglat : splitStringArray[5] , oglong : splitStringArray[6]};
        peopleArray[msgFrom] = ploc ;
        peopleArray[msgFrom].ambulances = []; 
        console.log(sizeof(peopleArray[msgFrom].ambulances));
        var currtime = new Date();
        peopleArray[msgFrom].finishtime = currtime.getTime() + ONE_MINUTE ; 
        
        res.send(`
            <Response>
                <Message>We will Update you on ambulance availaility in a minute, Please wait</Message>
            </Response>
        `);

        var timerFunction = function(msgFromNumber){
            var socs = peopleArray[msgFromNumber].ambulances ;
            if(sizeof(socs) == 0){
                 sendMessageWithBody(msgFromNumber,'No ambulances found Sorry')                    
            }; 
        };
        //console.log("about to emit");
    
        //eventEmitter.emit("emitForLoc", msgFrom);
        
        //console.log("emited the value");
        setTimeout(function() {
            timerFunction(msgFrom);
        }, TWO_MINUTES);
        console.log("time out set");
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

function getDuration(olat , olong , dlat , dlong) {
    var duration;
    distance.get({
    origin: olat + ','+ olong,
    destination: dlat+','+ dlong

  },
  function(err, data) {
    if (err) return console.log(err);
    console.log(data.distance);
    console.log(data.duration);
    duration = data.duration;   
  });
    return duration;
}
