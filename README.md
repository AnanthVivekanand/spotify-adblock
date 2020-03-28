# MacOS Spotify Desktop Adblocker

This project uses a proxy to strip all ad-related requests from the Spotify desktop application.

## Instructions

Open Spotify desktop, open the dropdown from the top-right, and open settings. Scroll all the way down settings and find "Proxy" (you may need
to look under Advanced Settings).

Configure it as shown:

![Proxy config](https://i.imgur.com/TaEWjkB.png)

Run: `git clone https://github.com/AnanthVivekanand/spotify-adblock-macos.git && cd spotify-adblock-macos` 

Run: `npm i`

Run: `export PORT=8080`  

Run: `npm start`

Great, your proxy server for Spotify is now working! You should be seeing: 

![Working](https://i.imgur.com/ASJKLwc.png)
