# Magic Mirror Module: MMM-ReddToLEave
This [MagicMirror2](https://github.com/MichMich/MagicMirror) module allows you show a card containing information on when you 
should leave to make your scheduled calendar events.

![Condensed view screenshot](https://github.com/dannoh/mmm-redd-moon-phases/blob/main/images/condensed.png?raw=true)
![Full view screenshot](https://github.com/dannoh/mmm-redd-moon-phases/blob/main/images/full.png?raw=true)
## Installation

In your terminal, go to your MagicMirror's Module folder:
````
cd ~/MagicMirror/modules
git clone https://github.com/dannoh/MMM-ReddToLeave.git
````

Configure the module in your `config.js` file.

## Using the module

````javascript
modules: [
          {
            module: "MMM-ReddToLeave",
            header: "",
            position: "top_left",
            config: { 
              calendarNames: ["CALENDAR NAME"], 
              mapsApiKey: "Google maps api key", 
              homeAddress: "Full address of your departure location"
          }
        },
]
````

## Config Options
| **Option** | **Default** | **Description** |
| --- | --- | --- |
| `calendarNames` | <empty> | The names of the calendars you want monitored.  Empty will monitor all calendars. You can use the `name` property on your calendar config to give them names. |
| `mapsApiKey` | '' | From the [Google Cloud Console](https://console.cloud.google.com/apis) Enable the Routes API and get an API key.  This is not entirely free, so be sure to understand your potential usage and costs and if exceeds the free options.  |
| `homeAddress` | '' | Your home address, will be used by the Routes API to compute drive times. |
| `shortPollingStart` | 60 | How many minutes before departure should we start updating the drive time. See `shortPollingInterval` |
| `shortPollingInterval` | 5 | Once we are in the short polling window (see `shortPollingStart`) how many minutes should we wait before updating the drive time again. |
| `longPollingStart` | 120 | How many minutes before departure should we start updating the drive time. See `longPollingInterval` |
| `longPollingInterval` | 30 | Once we are in the long polling window (see `longPollingStart`) how many minutes should we wait before updating the drive time again. |
| `fudgeFactor` | 0 | How many minutes should we subtract from the time to leave, just to make sure everyone is ready to go in time. |

## Long vs Short Polling
The basic concept is that starting in the long polling window we want to occasionally update the drive time. If we are still 3 hours from having to leave, there is no reason to update the drive time every 5 minutes.  Once we get closer to the time to leave, the short polling window, then we might want to update the drive time more frequently.

## Issues? 
Drop me a note in the Issues and I'll take a look.  I created this for myself but decided to publish it anyways, so it works for my specific use cases and I didn't spend a large amount of time testing other scenarios.