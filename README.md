05.15.2019<br />
Sandru Sebastian<br />
Paul Iusztin<br />
Universitatea Politehnica Timișoara<br />
Anul III CTI - Sisteme Integrate<br />

# IoT : Two Wi-Fi Modules with different sensors communicating with a Mobile Application

## 1. Hardware Parts
### __1.1 Arduino Uno(1x)__<br />
Arduino Uno is the main component and its responsibilities are the communication process with the ESP8266 and DHT11 Sensors. This module will ask the 
sensors for data every second and will send the data over the internet with the ESP8266 modules. Basically, there is an infinite cycle of 
collecting data and sending it to the server<br />
![Arduino One schema](http://www.electronoobs.com/images/Arduino/tut_31/arduino_uno_scheamtic_ch340.png)<br />
### __1.2 ESP8266(2x)__<br />
ESP8266 is an Wi-Fi module, more exactly a low-cost Wi-Fi microchip with full TCP/IP stack and microcontroller
capability produced by manufacturer Espressif Systems[1] in Shanghai, China. It can connects to a entity and send
data over the internet. Here, we had some issues with the project. Due to the fact that ESP8266 needs 3.3V, which 
the arduino one can actually provide, we thought it's a good idea of buying one of those. Unluckly, it can start with
3.3V, but some of ESP8226 are so bad designed that they actually need more than 3.3V but not 5V when making a request
to the server. 
![ESP8266](https://upload.wikimedia.org/wikipedia/commons/8/84/ESP-01.jpg)<br />
![ESP8266s](https://www.itead.cc/media/wysiwyg/Products/ESP-01_Schematic.png)<br />
### __1.3 DHT11 temperature and humidity sensor plate for ESP8266 ESP-01 and ESP-01S(1x)__<br />
Those modules are designed for ESP8266. This module to ESP8266-01 / ESP-01S as the master, DHT11 for the temperature and humidity sensor. ESP8266 collection environment temperature and cooling upload to the server. Support 3.7v-12V DC power supply (3.7V lithium battery). Can be used as a moisture and humidity collection node for intelligent home or IOT projects.
![sensors](https://www.electronicshub.org/wp-content/uploads/2018/04/DHT11-Humidity-Sensor-with-ESP8266-and-ThingSpeak-Circuit-Diagram.jpg)
### __1.4 Arduino Nano(1x)__
This module is used for the second part and like the previous arduino, its main responsibilities are the communication process with the ESP8266 and UltraSonic Sensor.
The Arduino Nano is a small, complete, and breadboard-friendly board based on the ATmega328 (Arduino Nano 3.x). It has more or less the same functionality of the Arduino Duemilanove, but in a different package. It lacks only a DC power jack, and works with a Mini-B USB cable instead of a standard one.
Also, as the previous one, it gets data from the ultrasonic sensor and send it to a entity using ESP8266
<br />

![an](https://store-cdn.arduino.cc/uni/catalog/product/cache/1/image/500x375/f8876a31b63532bbba4e781c30024a0a/a/0/a000005_front.jpg)<br />
### __1.5 Ultrasonic Ranging Module HC - SR04(1x)__<br />
Ultrasonic ranging module HC - SR04 provides 2cm - 400cm non-contact
measurement function, the ranging accuracy can reach to 3mm. The modules
includes ultrasonic transmitters, receiver and control circuit. The basic principle
of work:
(1) Using IO trigger for at least 10us high level signal,
(2) The Module automatically sends eight 40 kHz and detect whether there is a
pulse signal back.
(3) IF the signal back, through high level , time of high output IO duration is
the time from sending ultrasonic to returning.
Test distance = (high level time×velocity of sound (340M/S) / 2 <br />
![c](https://i2.wp.com/randomnerdtutorials.com/wp-content/uploads/2013/11/ultrasonic-sensor-with-arduino-hc-sr04.jpg?ssl=1)
### __1.6 Hardware Arhitecture__
This is the main schematic for the both of our Wi-Fi Nodes.
![q](https://cdn.instructables.com/FLH/6JWL/IKZQ73JD/FLH6JWLIKZQ73JD.LARGE.jpg)<br />
### __1.7 Code__<br />
``` #include <SoftwareSerial.h>
#include <EduIntro.h>

DHT11 dht11(D7);  // creating the object sensor on pin 'D7'

int C;   // temperature C readings are integers
float F; // temperature F readings are returned in float format
int H;   // humidity readings are integers

const byte rxPin = 2; // Wire this to Tx Pin of ESP8266
const byte txPin = 3; // Wire this to Rx Pin of ESP8266

String data = "test";
String ssid ="AndroidAP3394";
String password="sebi1234";
String server = "192.168.43.140"; // www.example.com
String uri = "/postStatus";// our example is /esppost.php

// We'll use a software serial interface to connect to ESP8266
SoftwareSerial ESP8266 (rxPin, txPin);

void setup() {
  Serial.begin(115200);
  ESP8266.begin(115200); // Change this to the baudrate used by ESP8266
 
  delay(1000); // Let the module self-initialize
}



void loop() {
  Serial.println("Sending an AT command...");
  
  String cmd = "AT+CWJAP_CUR=\"" +ssid+"\",\"" + password + "\"";
  
  ESP8266.println(cmd);

  readTempHum();  
  httppost();
  
  delay(1000);
  
  while (ESP8266.available()){
     String inData = ESP8266.readStringUntil('\n');
     Serial.println("Got reponse from ESP8266: " + inData);    
  }  
}


void httppost () {

  ESP8266.println("AT+CIPSTART=\"TCP\",\"" + server + "\",80");//start a TCP connection.

  if( ESP8266.find("OK")) {
    Serial.println("TCP connection ready");
  } 
  delay(1000);
  
  String postRequest =
    "POST " + uri + " HTTP/1.0\r\n" +
    "Host: " + server + "\r\n" +
    "Accept: *" + "/" + "*\r\n" +
    "Content-Length: " + data.length() + "\r\n" +
    "Content-Type: application/x-www-form-urlencoded\r\n" +
    "\r\n" + data;

  String sendCmd = "AT+CIPSEND=" + postRequest.length()+2;//determine the number of caracters to be sent.

  ESP8266.print(sendCmd);

  ESP8266.println(postRequest.length() );

  delay(500);

  if(ESP8266.find(">")) { 
    Serial.println("Sending..");
    ESP8266.println(postRequest);
    if( ESP8266.find("SEND OK")) { 
      Serial.println("Packet sent");
    ESP8266.println("AT+CIPCLOSE");
    }
  }
}

void readTempHum() {
  dht11.update();

  C = dht11.readCelsius();       // Reading the temperature in Celsius degrees and store in the C variable
  F = dht11.readFahrenheit();   // Reading the temperature in Fahrenheit degrees and store in the F variable
  H = dht11.readHumidity();     // Reading the humidity index
 
  // Print the collected data in a row on the Serial Monitor
  Serial.print("H: ");
  Serial.print(H);
  Serial.print("\tC: ");
  Serial.print(C);
  Serial.print("\tF: ");
  Serial.println(F);

  delay(1000);                // Wait one second before get another temperature reading
}
``` 
<br \>
## 2. Software Part <br />
### __2.1 Server-Side__ <br />
The server is the middle-layer between the hardware and the GUI. We built a small, light-weight server with __NodeJs__ using Express.js.
It has the following endpoints (GetStatus/PostStatus) so wi-fi nodes can post the status and the client-side can request the status
### __2.2 Client-Side__ <br />
The mobile app is built with __React-Native.js__ which is a js framework for developing mobile application on both iOS and Android.
Mention to say, it works for the both mobile operating systems. The working principle is simple and lightweight. The mobile application
makes a request every 1-2 seconds and updates the screen. As long as the server is up, it will always get data from it.<br /><br /><br />

