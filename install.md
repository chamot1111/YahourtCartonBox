Yahourt Carton Box
==================

Install the Noob distrib on your Raspberry Pi. When you have the choice between all the Os install Raspbian.

At first launch the raspi-config program is launched. Enable the camera.

Install node.js using this blog article: [http://oskarhane.com/raspberry-pi-install-node-js-and-npm/](http://oskarhane.com/raspberry-pi-install-node-js-and-npm/).

After install mpg321:

	sudo apt-get update && sudo apt-get -y upgrade && sudo apt-get install mpg321

The next thing is to ensure that your mpg321 play the mp3 file to the good output (hdmi or jack). You can find the command to do that in this article: [http://www.raspberrypi-spy.co.uk/2012/06/raspberry-pi-speakers-analog-sound-test/](http://www.raspberrypi-spy.co.uk/2012/06/raspberry-pi-speakers-analog-sound-test/)

When I test the analog output on my Raspberry Pi the output was very poor. I use actually the HDMI output for the sound (speaker is on my screen).
