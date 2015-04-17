user = {};

//Set this to the name of your bean as defined in the Arduino code
user.BLEId = 'LightBlueBean2';

//Keep track of the last temperature read so we only update it on
// data.sparkfun.com when it's changed
user.lastTemperature = -273.15;

//Read data from the Bean's scratch area; the data in this scratch area
// is defined in the Arduino code. This function ensures that the LED
// slider values match the current values on the Bean.
user.synchronizeLeds = function()
{
	if(!user.app)
		return;
	
	//If the scratch read operation (below) succeeds, this function gets
	// called with the data read
	function onDataReadSuccess(data)
	{
		var ledData = new Uint8Array(data);

		document.getElementById('redLed').value   = ledData[0];
		document.getElementById('greenLed').value = ledData[1];
		document.getElementById('blueLed').value  = ledData[2];

		console.log('Led synchronized.');
	};

	//If the scratch read operation (below) fails, this function gets
	// called and the Bean is disconnected
	function onDataReadFailure(errorCode)
	{
		console.log('Failed to synchronize leds with error: ' + errorCode);
		user.app.disconnect();
	};

	//Attempt to read data from scratch area 1 of the Bean
	user.app.readDataFromScratch(1, onDataReadSuccess, onDataReadFailure);
};


//Send an updated LED value to the Bean (range 0-255)
user.setLED = function(r, g, b)
{
	if(!user.app || !user.app.connected)
		return;

	//Create packet to send
	data = new Uint8Array([redLed, greenLed, blueLed]);

	//Called if scratch data write (below) succeeds
	function onDataWriteSuccess() {
		console.log('Succeded writing LED data.');
	}

	//Called if scratch data write (below) fails; disconnects from Bean
	function onDataWriteFailure(errorCode){
		console.log('Failed to write data with error: ' + errorCode);
		user.app.disconnect();
	};

	//Attempt to write the scratch area
	user.app.writeDataToScratch(1, data, onDataWriteSuccess, onDataWriteFailure);
}


//When the LED sliders are moved in the UI, this function gets called to
// update the values in the Bean.
user.sendLedUpdate = function()
{
	//If not connected, don't allow the sliders to change value
	if(!user.app || !user.app.connected)
	{
		redLed   = document.getElementById('redLed').value   = 0;
		greenLed = document.getElementById('greenLed').value = 0;
		blueLed  = document.getElementById('blueLed').value  = 0;
	}
	else
	{
		//Fetch LED values from UI
		redLed   = document.getElementById('redLed').value;
		greenLed = document.getElementById('greenLed').value;
		blueLed  = document.getElementById('blueLed').value;
		user.setLED(redLed, greenLed, blueLed);
	}
};


//Similarly to the LED function, read the current temperature from the
// temperature scratch buffer.
user.readTemperature = function()
{
	if(!user.app)
		return;

	function onDataReadSuccess(data)
	{
		var temperatureData = new Uint8Array(data);
		temperature = temperatureData[0];
		document.getElementById('temperature').innerHTML = temperature;

		//Only send the temperature to data.sparkfun.com if it's changed
		if(temperature != user.lastTemperature)
		{
			app.sparkWrite(user.BLEId, 'temperature', temperature);
			lastTemperature = temperature;
		}
	}

	function onDataReadFailure(errorCode)
	{
		console.log('Failed to read temperature with error: ' + errorCode);
		user.app.disconnect();
	};

	user.app.readDataFromScratch(2, onDataReadSuccess, onDataReadFailure);
};


//When we get data back from data.sparkfun.com, call this function
user.onSparkFunDataReceived = function(data)
{
	//console.log('fun: ' + JSON.stringify(data));
}


user.onConnect = function(app)
{
	console.log("Connected!"); 

	//Keep a reference to the main app instance
	user.app = app;

	//Unhide UI elements that were hidden before connect
	document.getElementById('ledControl').style.display         = 'block';
	document.getElementById('temperatureDisplay').style.display = 'block';

	//Fetch current LED values and update UI sliders
	user.synchronizeLeds(app);

	//Periocally read temperature and send it to data server.
	app.intervals.push(setInterval(function(){user.readTemperature()}, 500));

	//Periodically read data server
	app.intervals.push(setInterval(function(){app.sparkRead(user.onSparkFunDataReceived)}, 1000));
}


//Called when Spark button in UI is pressed: triggers manual read from
// data.sparkfun.com without connection
user.onSpark = function(app)
{
	app.sparkRead(user.onSparkFunDataReceived);
}


//When disconnecting, remove app instance
user.onDisconnect = function()
{
	if(!user.app)
		return;
	user.app = undefined;
}
