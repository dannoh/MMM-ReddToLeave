Module.register("MMM-ReddToLeave", {
	defaults: {
		calendarNames: [],
		mapsApiKey: "",
		homeAddress: "",
    showDebugMessages: false,
    shortPollingStart: 60, //Minutes
    shortPollingInterval: 5, //Minutes
    longPollingStart: 120, //Minutes
    longPollingInterval: 30, //Minutes
    fudgeFactor: 0 //Minutes
	},
	displayItems: [], // { calendarItem: theItem, timeToArrive: Date, timeToDepart: Date, lastUpdated: Date, timeToLeave: string }
	/**
	 * Apply the default styles.
	 */
	getStyles() {
		return [];
	},

	getTemplate() {
		return "templates/MMM-ReddToLeave.njk";
	},

	getTemplateData() {
		return { displayItems: this.displayItems };
	},
	/**
	 * Pseudo-constructor for our module. Initialize stuff here.
	 */
	start() {
		this.addFilters();
		setInterval(() => {
			this.updateDisplayItems();
			this.updateDom(300);
		}, 30 * 1000);
	},
	addFilters() {
		this.nunjucksEnvironment().addFilter("formatDate", (date) => {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'  };
      return date.toLocaleDateString(config.locale, options);s
    });
	},
	updateDisplayItems() {
		this.displayItems = this.displayItems.filter((c) => c.timeToArrive > new Date());
		this.debug(`ReddToLeave: Found ${this.displayItems.length} items to update`);
		this.displayItems.forEach((item) => {
			this.debug(`ReddToLeave:   Updating ${item.calendarItem.title}`);
			this.setTimeToLeave(item);
			this.setNewDepartureTime(item);
		});
	},
	async setNewDepartureTime(item, force) {
		const diffMinutes = (item.timeToDepart - new Date()) / 1000 / 60;
		const lastUpdated = (new Date() - item.lastUpdated) / 1000 / 60;
		if (force || (diffMinutes < this.config.longPollingStart && diffMinutes > this.config.shortPollingStart && lastUpdated > this.config.longPollingInterval) || (diffMinutes < this.config.shortPollingStart && lastUpdated > this.config.shortPollingInterval)) {
			this.debug(`ReddToLeave: Updating traffic time for ${item.calendarItem.title}`);     
			const {duration, hasTolls} = await this.getTrafficTime(this.config.homeAddress, item.calendarItem.location);
			const departureTime = new Date(item.timeToArrive - (duration * 1000) - (this.config.fudgeFactor * 60 * 1000));
			item.timeToDepart = departureTime;
      item.travelTime = this.millisecondsToFormattedTime(duration * 1000);
      item.hasTolls = hasTolls;
      item.lastUpdated = new Date();
      this.setTimeToLeave(item);
		}
	},
	/**
	 * Handle notifications received by the node helper.
	 * So we can communicate between the node helper and the module.
	 *
	 * @param {string} notification - The notification identifier.
	 * @param {any} payload - The payload data`returned by the node helper.
	 */
	socketNotificationReceived: function (notification, payload) {},

	/**
	 * This is the place to receive notifications from other modules or the system.
	 *
	 * @param {string} notification The notification ID, it is preferred that it prefixes your module name
	 * @param {number} payload the payload type.
	 */
	notificationReceived(notification, payload, sender) {
		if (notification == "CALENDAR_EVENTS") {
			this.processCalendarEvents(payload);
		}
	},

	async processCalendarEvents(payload) {
		// { calendarItem: theItem, timeToArrive: Date, timeToDepart: Date, lastUpdated: Date, timeToLeave: string }
		for (let x = 0; x < payload.length; x++) {
			const item = payload[x];
			if ((this.config.calendarNames.length === 0 || this.config.calendarNames.includes(item.calendarName)) && item.today) {
				try {
					if (new Date(+item.startDate) > new Date()) {
						const existing = this.displayItems.find((c) => c.calendarItem.startDate == item.startDate && c.calendarItem.location == item.location && c.calendarItem.title == item.title);
						if (existing) {
							continue;
						}
            this.debug(`ReddToLeave: Failed to find ${item.startDate} ${item.location} ${item.title}`);
            this.debug(this.displayItems);
						let timeToArrive = new Date(+item.startDate);
						//starts in the future
						const match = /Arrival Time:\s*(\d+:\d+...)/g.exec(item.description);
						if (match) {
							const arrivalTimeString = match[1];
							timeToArrive = new Date(new Date().toDateString() + " " + arrivalTimeString);
						}
						var newItem = { calendarItem: item, timeToArrive: timeToArrive, timeToDepart: timeToArrive, lastUpdated: new Date(), travelTime: "Searching..." };
						this.displayItems.push(newItem);
            await this.setNewDepartureTime(newItem, true);						
					}
				} catch (error) {
					console.error(error);
				}
			}
		}
		this.updateDom();
	},
  millisecondsToFormattedTime(milliseconds) {
    const diffHrs = Math.floor((milliseconds % 86400000) / 3600000);
			const diffMins = Math.round(((milliseconds % 86400000) % 3600000) / 60000);
      if(diffHrs === 0 && diffMins < 1) {
        return "Less than a minute";
      } else {
        const hours = `${diffHrs} Hour${diffHrs > 1 ? "s":""}`;
        const minutes = `${diffMins} Minute${diffMins > 1 ? "s":""}`;
        return diffHrs > 0 ? `${hours} ${minutes}` : minutes;
      }
  },
	setTimeToLeave(item) {
		const diffMs = item.timeToDepart - new Date();
		if (diffMs < 0) {
			item.timeToLeave = "Now";
      //TODO:DF maybe if we get to 5 minutes ago we show a smaller message saying "10 minutes ago" etc
		} else {
			const diffHrs = Math.floor((diffMs % 86400000) / 3600000);
			const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
      if(diffHrs === 0 && diffMins < 1) {
        item.timeToLeave = "Now";
      } else {
        const hours = `${diffHrs} Hour${diffHrs > 1 ? "s":""}`;
        const minutes = `${diffMins} Minute${diffMins > 1 ? "s":""}`;
        const timeToLeave = diffHrs > 0 ? `${hours} ${minutes}` : minutes;
        item.timeToLeave = timeToLeave;
      }
		}
	},
	async getTrafficTime(origin, destination) {
    if(!this.config.mapsApiKey || !this.config.homeAddress) {
      console.error("ReddToLeave: No google api key or home address provided.")
      return {duration: 0, hasTolls: false };
    }
		const body = {
			origin: {
				address: origin
			},
			destination: {
				address: destination
			},
			travelMode: "DRIVE",
			routingPreference: "TRAFFIC_AWARE_OPTIMAL"
		};

		// Define headers
		const headers = {
			"Content-Type": "application/json",
			"X-Goog-Api-Key": this.config.mapsApiKey,
			"X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.staticDuration,routes.warnings"
		};

		// Define the URL 
		const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

		try {
			// Send the POST request
			const response = await fetch(url, {
				method: "POST",
				headers: headers,
				body: JSON.stringify(body)
			});

			// Check if the response status is OK
			if (!response.ok) {
				console.error(response);
				throw new Error(`HTTP error! Status: ${response.status}`);
			}

			// Parse the response as JSON
			const data = await response.json();
			this.debug(data);
			return {duration: +data.routes[0].duration.replace("s", ""), hasTolls: data.routes[0].warnings && data.routes[0].warnings.includes("This route has tolls.") };
		} catch (error) {
			console.error("Error:", error);
		}
	},
  debug(message) {
    if(!this.config.showDebugMessages)
      return;
    console.log(message);
  }
});
