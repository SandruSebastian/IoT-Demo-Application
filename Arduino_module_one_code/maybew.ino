#include <SoftwareSerial.h>
#include <EduIntro.h>

DHT11 dht11(D7);  // creating the object sensor on pin 'D7'

int C;   // temperature C readings are integers
float F; // temperature F readings are returned in float format
int H;   // humidity readings are integers

const byte rxPin = 2; // Wire this to Tx Pin of ESP8266
const byte txPin = 3; // Wire this to Rx Pin of ESP8266

String data = "test";
String ssid ="PaulNetwork";
String password="vafl8118";
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
  
