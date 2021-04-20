// Your MapboxGL API Key
const key = 'pk.eyJ1IjoiZjN5ZHJ1cyIsImEiOiJjazJrazZhcDUyMzVrM2hsNm5ubTBkcHE0In0.U6jJzJAu20bZ_rqWosG_Kw'

// Create a new Mappa instance using Mapboxgl.
const mappa = new Mappa('MapboxGL', key);
let myMap;
let canvas;
let userPositions = {};

let mqttClient;
let myId;

//init popup
let popup = new Popup();
popup.hidePop();
popup.setTrigger({
    // center:[114.35690584549887,30.5286891090623],
    centers:[
        [114.35690584549887,30.5286891090623],
        [118.75019948598697,32.06493761717022]
    ],
    distance:0.2
});


function setup(){
  canvas = createCanvas(windowWidth,windowHeight);

  mqttClient = mqtt.connect('wss://mqtt.flespi.io:443', {
    username: "1J6yLhEH3Kho88pd2X1dAU7Mutx9Yj4PSYdu4GZXe4ac3pfVc4WANTa7ay4ZHXEp"
  });

    mqttClient.on('connect', function() {
      // Get a unique name for this session
      let fullId = mqttClient.options.clientId;
      myId = fullId.substring(fullId.length-3);

    mqttClient.subscribe('presence', function(err) {
      if (!err) {
        mqttClient.publish(masterTopic+'/start/'+'/'+myId, 'YOUR_HELLO_HERE');
        mqttClient.subscribe(masterTopic+'/+/'+'/#', undefined);
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

                //show popup
                if(popup.triggerParam){
                    let latLng = position.split(",");
                    let canTrigger = popup.canTrigger(latLng[1], latLng[0]);
                    if (canTrigger) {
                        popup.setInnerText("Hello World!\n" + latLng[0] + "\n" + latLng[1] + "\n");
                        popup.setLngLat(latLng[1], latLng[0]);
                    }

                    //地图定位
                    if(myMap.map){
                        myMap.map.flyTo({
                            center:[latLng[1],latLng[0]],
                            // zoom:12
                        })
                    }
                }
            }
        });
  });
  // console.log(mappa)
  myMap = mappa.tileMap(32.06574374816392,118.7466935714768 ,15); // lat 0, lng 0, zoom 4
  myMap.overlay(canvas);

  //测试浮云
  // popup.setLngLat(118.7466935714768,32.06574374816392);
  myMap.onChange(function () {
    //地图移动时更新popup的位置
    if(popup.lngLat){
      popup.setLngLat(popup.lngLat[0],popup.lngLat[1]);
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
    print("Pos[0]:"+position.coords.latitude+","+position.coords.longitude);
  }
  // DO NOT save our own position here (get from MQTT)
  // userPositions.push(position);

  if (mqttClient.connected) {
    mqttClient.publish(masterTopic+'/pos/'+myGroup+'/'+myId, position.coords.latitude+","+position.coords.longitude);
  }
}

function draw(){
  clear();
  // print("num users: "+ Object.keys(userPositions).length);
  Object.keys(userPositions).forEach(function (id) {
    if (userPositions[id].length > 1) {
      // Draw a circle at the beginning of the path
      fill(0,255,0);
      let startPos = getPixel(userPositions[id][0]);
      circle(startPos.x, startPos.y, 20);
      push();
      stroke(255,0,0);
      strokeWeight(5);
      for (let i=1; i<userPositions[id].length; i++) {
        // Previous position
        let posA = getPixel(userPositions[id][i-1]);
        // New position
        let posB = getPixel(userPositions[id][i]);
        // Draw a line from previous to new
        line(posA.x, posA.y, posB.x, posB.y);
      }
      pop();
      // Draw a circle at the end of the path
      fill(0,0,255);
      let endPos = getPixel(userPositions[id][userPositions[id].length - 1]);
      circle(endPos.x, endPos.y, 30);

      fill(255);
      textSize(24);
      text(id, endPos.x, endPos.y);
    }
  });
  if (myId) {
    // Show my user ID
    fill(0,255,0);
    textSize(36);
    text("myId: "+myId, 20, windowHeight-40);
  }

function getPixel(location) {
  // e.g. location: "32.124,118.224"
  // print(location);
  let lat = split(location,",")[0];
  let long = split(location,",")[1];
  return myMap.latLngToPixel(lat, long);
}

/**
 * 浮云类
 * @param option  配置项
 * @constructor
 */
function Popup(option) {
    option = option || {};//配置项
    let popDom = document.createElement("div");
    document.body.appendChild(popDom);
    this.popDom = popDom;
    popDom.className = option.className ? "popup " + option.className : "popup";//dom 类名
    let width = option.width ? option.width : 200;
    let height = option.height ? option.height : 100;
    popDom.style.width = width + 'px';
    popDom.style.height = height + 'px';

    this.lngLat = null;//浮云位置
    this.triggerParam = null;//浮云触发条件
    //上部内容
    let contentDom = document.createElement("div");
    contentDom.className = "content";
    contentDom.innerText = "Hello World!";
    popDom.appendChild(contentDom);
    //下部箭头
    let arrowDom = document.createElement("div");
    arrowDom.className = "arrow";
    popDom.appendChild(arrowDom);
    //关闭按钮
    let closeDom = document.createElement("div");
    closeDom.className = "close";
    closeDom.innerText = "×";
    closeDom.onclick = function () {
        hidePop();
    };
    popDom.appendChild(closeDom);

    /**
     * 设置触发坐标与阈值范围
     * @param option center  中心点，默认[118.7973883323,32.0442301003](经度，纬度)
     * @param option centers  多个中心点
     * @param option distance  阈值范围，默认0.1，单位千米
     */
    this.setTrigger = function (option) {
        option = option || {};
        option.center = option.center ? option.center : [118.7973883323, 32.0442301003];
        option.centers = option.centers?option.centers:null;
        option.distance = option.distance ? option.distance : 100;
        this.triggerParam = option;
    };

    //判断点是否在触发条件内
    //[经度，纬度]
    this.canTrigger = function (lng, lat) {
        let $this = this;
        if (!$this.triggerParam) {
            throw "triggerParam is not defined"
        }
        let triggerParam = $this.triggerParam;

        let lat1 = lat;
        let lng1 = lng;

        function getDis(lat2,lng2) {
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

        let dis = triggerParam.distance;
        //只有一个目标点
        if(triggerParam.center){
           let s = getDis(triggerParam.center[1],triggerParam.center[0]);
            if(s<=dis){
                return true
            }else{
                return false
            }
        }else if(triggerParam.centers){
            for(let m=0;m<triggerParam.centers.length;m++){
                let s = getDis(triggerParam.centers[m][1],triggerParam.centers[m][0]);
                if(s<=dis){
                    return true
                }
            }
            return false
        }else{
            return false
        }


    };
    //设置位置
    this.setLngLat = function (lng, lat) {
        if (!lng || !lat) return;
        if (myMap) {
            let pos = myMap.latLngToPixel(lat, lng);

            // let pos = this.map.project([latLng]);
            //pos.x,pos.y
            popDom.style.setProperty("top", pos.y - height + 'px');
            popDom.style.setProperty("left", pos.x - width / 2 + 'px');
            showPop();
            this.lngLat = [lng, lat];
        } else {
            throw "myMap have not install yet"
        }

    };
    //删除浮云
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
    //显示
    let showPop = function () {
        popDom.style.setProperty("display", "block");
    };
    this.showPop = showPop;
    //隐藏
    let hidePop = function () {
        popDom.style.setProperty("display", "none");
    };
    this.hidePop = hidePop;
    //设置内容
    this.setInnerText = function (innerText) {
        if (innerText) {
            contentDom.innerText = innerText;
        }

    }
}