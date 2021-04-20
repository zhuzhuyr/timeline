// Your MapboxGL API Key
const key = 'pk.eyJ1IjoiZjN5ZHJ1cyIsImEiOiJjazJrazZhcDUyMzVrM2hsNm5ubTBkcHE0In0.U6jJzJAu20bZ_rqWosG_Kw'

// Create a new Mappa instance using Mapboxgl.
const mappa = new Mappa('MapboxGL', key);
let myMap;
let canvas;
let userPositions = {};
let mqttClient;

let myId;


// poi
let POIBOX = {
    "0":{
        coordinates: [118.7974580800,32.0442474300],
        name:"Office of the President",
        single:false,
        msg:"After the outbreak of the wuchang uprising, sun yat-sen returned to China and was elected as the provisional President of the republic of China. On January 1, 1912, sun yat-sen was inaugurated at the presidential palace in nanjing and formed the provisional government of the republic of China.  "
      
    },
    "1": {
        coordinates:[118.8511429300,32.0652607200],
        name:"Sun Yat-sen Mausoleum",
        single:false,
        msg:"Dr. Sun yat-sen devoted his whole life to the Chinese revolution. He died of liver cancer in Beijing on March 12, 1925. In 1929, the body was transferred from Beijing to the purple mountain mausoleum in nanjing."
    },
    "2": {
        coordinates:[118.77825996278185,32.0434201154258],
        name:"Sun zhongshan",
        single:false,
        msg:"In the 1940s, the first bronze              statue of sun yat-sen was donated and cast by a Japanese friend, chuangji mei, and placed in xinjiekou. The second statue was made by dai guangwen, a contemporary sculptor, in 1996."
    }
};
const Color0 = [255, 255, 0], Color1 = [255,0,0];

// Traverse the POIBOX to get the coordinates to set the trigger
let centers = [];
for(let i in POIBOX){
    centers.push(POIBOX[i]["coordinates"]);
}
//init popup
let popup = new Popup({
    width:300,//Window width
    height:200//Window height
});
popup.hidePop();
popup.setTrigger({
    // center:[114.35690584549887,30.5286891090623],
    centers: centers,
    radius: 0.2
});



function setup() {
    canvas = createCanvas(windowWidth, windowHeight);

    mqttClient = mqtt.connect('wss://mqtt.flespi.io:443', {
        username: "1J6yLhEH3Kho88pd2X1dAU7Mutx9Yj4PSYdu4GZXe4ac3pfVc4WANTa7ay4ZHXEp"
    });

    mqttClient.on('connect', function () {
        // Get a unique name for this session
        let fullId = mqttClient.options.clientId;
        myId = fullId.substring(fullId.length - 3);

        mqttClient.subscribe('presence', function (err) {
            if (!err) {
                mqttClient.publish(masterTopic + '/start/' + '/' + myId, 'YOUR_HELLO_HERE');
                mqttClient.subscribe(masterTopic + '/+/' + '/#', undefined);
            }
        });

        mqttClient.on('message', function (topic, message) {

            print(topic + ": " + message);
            let subtopics = split(topic, '/');
            if (subtopics[2] == subtopics[1] == 'pos') {
                // Initialise array on first position
                if (!userPositions[subtopics[3]]) {
                    userPositions[subtopics[3]] = [];
                }
                // Save this position
                let position = '';
                for (let i = 0; i < message.length; i++) {
                    position += String.fromCharCode(message[i]);
                }
                userPositions[subtopics[3]].push(position);

                let latLng = position.split(",");
                //show popup
                if (popup.triggerParam) {

                    let poi_index = popup.canTrigger(latLng[1], latLng[0],true);
                    if (poi_index>-1) {
                        POIBOX[poi_index]['single'] = true;//Change signal, circle color changes
                        // popup.setInnerText("Hello World!\n" + latLng[0] + "\n" + latLng[1] + "\n");
                        popup.setInnerText(POIBOX[poi_index]['msg']+"\n" + latLng[0] + "\n" + latLng[1] + "\n");
                        popup.setLngLat(latLng[1], latLng[0]);

                    }else{
                        popup.hidePop();
                    }
                }
                //map location
                if (myMap.map) {
                    myMap.map.flyTo({
                        center: [latLng[1], latLng[0]],
                        // zoom:12
                    })
                }
            }
        });
    });
    // console.log(mappa)
    myMap = mappa.tileMap(32.06574374816392, 118.7466935714768, 15); // lat 0, lng 0, zoom 4
    myMap.overlay(canvas, function () {
    });

    //test window
    // popup.setLngLat(118.7466935714768,32.06574374816392);
    myMap.onChange(function () {
        //Update the location of popup as the map moves
        if (popup.lngLat) {
            popup.setLngLat(popup.lngLat[0], popup.lngLat[1]);
        }
    });

    let options = {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000
    };

    navigator.geolocation.watchPosition(gotPosition, undefined, options);
}

function gotPosition(position) {
    if (userPositions.length == 0) {
        print("Pos[0]:" + position.coords.latitude + "," + position.coords.longitude);
    }
    // DO NOT save our own position here (get from MQTT)
    // userPositions.push(position);

    if (mqttClient.connected) {
        mqttClient.publish(masterTopic + '/pos/' + myGroup + '/' + myId, position.coords.latitude + "," + position.coords.longitude);
    }
}

function draw() {
    clear();
    // print("num users: "+ Object.keys(userPositions).length);
    Object.keys(userPositions).forEach(function (id) {
        if (userPositions[id].length > 1) {
            // Draw a circle at the beginning of the path
            fill(0, 255, 0);
            let startPos = getPixel(userPositions[id][0]);
            circle(startPos.x, startPos.y, 20);
            push();
            stroke(255, 0, 0);
            strokeWeight(5);
            for (let i = 1; i < userPositions[id].length; i++) {
                // Previous position
                let posA = getPixel(userPositions[id][i - 1]);
                // New position
                let posB = getPixel(userPositions[id][i]);
                // Draw a line from previous to new
                line(posA.x, posA.y, posB.x, posB.y);
            }
            pop();
            // Draw a circle at the end of the path
            fill(0, 0, 255);
            let endPos = getPixel(userPositions[id][userPositions[id].length - 1]);
            circle(endPos.x, endPos.y, 30);

            fill(255);
            textSize(24);
            text(id, endPos.x, endPos.y);
        }
    });
    if (myId) {
        // Show my user ID
        fill(0, 255, 0);
        textSize(36);
        text("myId: " + myId, 20, windowHeight - 40);
    }
    // Show the poi
    for (let i in POIBOX) {
        // Get the lat/lng of each meteorite
        const pos = myMap.latLngToPixel(POIBOX[i]["coordinates"][1],POIBOX[i]["coordinates"][0]);
        let size = 20;
        if(POIBOX[i]["single"]){
            fill(Color1[0], Color1[1], Color1[2]);
        }else{
            fill(Color0[0], Color0[1], Color0[2]);
        }

        circle(pos.x, pos.y, size);
    }
}

function getPixel(location) {
    // e.g. location: "32.124,118.224"
    // print(location);
    let lat = split(location, ",")[0];
    let long = split(location, ",")[1];
    return myMap.latLngToPixel(lat, long);
}

/**
 * window
 * @param option  Configuration items
 * @constructor
 */
function Popup(option) {
    option = option || {};//Configuration items
    let popDom = document.createElement("div");
    document.body.appendChild(popDom);
    this.popDom = popDom;
    popDom.className = option.className ? "popup " + option.className : "popup";//dom The name of the class
    let width = option.width ? option.width : 200;
    let height = option.height ? option.height : 100;
    popDom.style.width = width + 'px';
    popDom.style.height = height + 'px';

    this.lngLat = null;//window location
    this.triggerParam = null;//Floating window trigger condition
    //The upper content
    let contentDom = document.createElement("div");
    contentDom.className = "content";
    contentDom.innerText = "Hello World!";
    popDom.appendChild(contentDom);
    //The lower arrow
    let arrowDom = document.createElement("div");
    arrowDom.className = "arrow";
    popDom.appendChild(arrowDom);
    //Close window
    let closeDom = document.createElement("div");
    closeDom.className = "close";
    closeDom.innerText = "×";
    closeDom.onclick = function () {
        hidePop();
    };
    popDom.appendChild(closeDom);

    /**
     * Set the trigger coordinates and threshold range
     * @param option center  Center point, default[118.7973883323,32.0442301003](Longitude, latitude)
     * @param option centers Multiple center points
     * @param option radius  Threshold range, by default 0.1, unit km
     */
    this.setTrigger = function (option) {
        option = option || {};
        option.center = option.center ? option.center : null;
        option.centers = option.centers ? option.centers : null;
        option.radius = option.radius ? option.radius : 100;
        this.triggerParam = option;
    };

    //Determine whether the point is within the trigger condition
    //[longitude, latitude]
    //If needNum is true, return the index of the centers if it matches the centers, otherwise return -1,
    //When needNum is false, return true/false
    this.canTrigger = function (lng, lat, needNum) {
        let $this = this;
        if (!$this.triggerParam) {
            throw "triggerParam is not defined"
        }
        let triggerParam = $this.triggerParam;

        let lat1 = lat;
        let lng1 = lng;

        function getDis(lat2, lng2) {
            let radLat1 = lat1 * Math.PI / 180.0;
            let radLat2 = lat2 * Math.PI / 180.0;
            let a = radLat1 - radLat2;
            let b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0;
            let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
                Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
            s = s * 6378.137;// EARTH_RADIUS;
            s = Math.round(s * 10000) / 10000;
            // print("s:"+s);
            return s
        }

        let dis = triggerParam.radius;
        //There's only one target point
        if (triggerParam.center) {
            let s = getDis(triggerParam.center[1], triggerParam.center[0]);
            if (s <= dis) {
                return true
            } else {
                return false
            }
        } else if (triggerParam.centers) {
            for (let m = 0; m < triggerParam.centers.length; m++) {
                let s = getDis(triggerParam.centers[m][1], triggerParam.centers[m][0]);
                // console.log(s)
                if (s <= dis) {
                    return needNum?m:true
                }
            }
            return needNum?-1:false
        } else {
            return needNum?-1:false
        }


    };
    //Set the location
    this.setLngLat = function (lng, lat) {
        if (!lng || !lat) return;
        if (myMap) {
            let pos = myMap.latLngToPixel(lat, lng);

            // let pos = this.map.project([latLng]);
            //pos.x,pos.y
            popDom.style.setProperty("top", pos.y - height-10 + 'px');//Arrow has a height of 10
            popDom.style.setProperty("left", pos.x - width / 2 + 'px');
            showPop();
            this.lngLat = [lng, lat];
        } else {
            throw "myMap have not install yet"
        }

    };
    //Delete the floating clouds
    let removePop = function (success, fail) {
        let deleteN = document.body;
        try {
            deleteN.removeChild(popDom);
            if (success) {
                success()
            }
        } catch (e) {
            if (fail) {
                fail()
            }
        }
    };
    this.removePop = removePop;
    // show
    let showPop = function () {
        popDom.style.setProperty("display", "block");
    };
    this.showPop = showPop;
    //hide
    let hidePop = function () {
        popDom.style.setProperty("display", "none");
    };
    this.hidePop = hidePop;
    //Set the content
    this.setInnerText = function (innerText) {
        if (innerText) {
            contentDom.innerText = innerText;
        }

    }
}