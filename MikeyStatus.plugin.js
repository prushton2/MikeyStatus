//META{"name":"MikeyStatus","source":"https://raw.githubusercontent.com/prushton2/MikeyStatus/master/MikeyStatus.plugin.js","website":"https://github.com/prushton2/MikeyStatus"}*//

class MikeyStatus {
	/* BD functions */
	getName () {
		return "MikeyStatus";
	}

	getVersion () {
		return "1.0.0";
	}

	getAuthor () {
		return "prushton2";
	}

	getDescription () {
		return "put a daily countdown in your discord status";
	}

	setData (key, value) {
		BdApi.setData(this.getName(), key, value);
	}

	getData (key) {
		return BdApi.getData(this.getName(), key);
	}

	/* Code related to Animations */
	load () {
		this.message = this.getData("message");
		this.deadline = this.getData("deadline");
		this.timeout = 86400;
		Status.authToken = this.getData("token");
	}

	start () {
		if (this.message == undefined || Status.authToken == undefined) return;
		this.Status_Animate();
	}

	stop () {
		clearTimeout(this.loop);
		Status.unset();
	}

	Status_Eval (string) {
		try {
			return ((string.startsWith("eval ")) ? (eval(string.substr(5))) : (string));
		}
		catch (e) {
			BdApi.showToast(e, {type: "error"});
			return "";
		}
	}

	Status_Animate () {
		console.log(this.deadline)

		let deltaTime = this.deadline - parseInt(Date.now()/1000)

		let deltaDays = parseInt(deltaTime/60/60/24)+1

		let statusmessage = this.message.replace("${time}", deltaDays )

		Status.set([statusmessage])
		this.loop = setTimeout(() => {this.Status_Animate()}, this.timeout*1000)
		
		
	}

	// Ui related, but special components
	newRawEdit (str = "") {
		let out = GUI.newTextarea();
		out.style.fontFamily = "SourceCodePro,Consolas,Liberation Mono,Menlo,Courier,monospace";
		out.placeholder = '"Test (Message)"\n"Test (Message)", "👍 (Symbol)"\n"Test (Message)", "emoji (Nitro Symbol)", "000000000000000000 (Nitro Symbol ID)"\n"eval new String(\'test\') (Javascript)"\n"eval new String(\'test\') (Javascript)", "eval new String(\'👍\') (Javascript)"\n...';
		out.value = str;
		return out;
	}

	newRichRow (text, emoji, optNitroId = undefined) {
		let hbox = GUI.newHBox();

		let textWidget = GUI.newInput(text);
		textWidget.placeholder = "Text";
		textWidget.style.marginRight = "15px";
		if (text != undefined) textWidget.value = text;
		hbox.appendChild(textWidget);

		// hbox.appendChild(GUI.newDivider());

		let emojiWidget = GUI.newInput(emoji);
		emojiWidget.placeholder = "👍 / nitro_name";
		emojiWidget.style.width = "140px";
		emojiWidget.style.marginRight = "15px";
		if (emoji != undefined) emojiWidget.value = emoji;
		hbox.appendChild(emojiWidget);

		//hbox.appendChild(GUI.newDivider());

		let optNitroIdWidget = GUI.newInput(optNitroId);
		optNitroIdWidget.placeholder = "(optional) nitro_id";
		optNitroIdWidget.style.width = "150px";
		if (optNitroId != undefined) optNitroIdWidget.value = optNitroId;
		hbox.appendChild(optNitroIdWidget);

		return hbox;
	}

	// Conversion related
	strToJson (str) {
		return str.split("\n").filter(i => i).map((element) => JSON.parse(`[${element}]`));
	}

	jsonToStr (animation) {
		if (animation == undefined) return ""

		let out = "";
		for (let i = 0; i < animation.length; i++) {
			out += JSON.stringify(animation[i]).substr(1).slice(0, -1) + "\n";
		}
		return out;
	}

	jsonToRichEdit (json) {
		let out = document.createElement("div");
		for (let i = 0; i < json.length; i++) {
			// text is 0, emoji is 1
			let row = undefined;
			if (json[i].length == 2) row = this.newRichRow(json[i][0], json[i][1]);
			else row = this.newRichRow(json[i][0], json[i][1], json[i][2]);

			if (i) row.style.marginTop = "15px";
			out.appendChild(row);
		}

		return out;
	}

	richEditToJson (editor) {
		return Array.prototype.slice.call(editor.childNodes).map((element) => {
				return Array.prototype.slice.call(element.childNodes)
					.filter(e => e.value.length)
					.map(e => e.value);
		}).filter(e => e.length);
	}

	// Settings
	getSettingsPanel () {
		let settings = document.createElement("div");
		settings.style.padding = "10px";

		// Auth token
		settings.appendChild(GUI.newLabel("AuthToken (https://discordhelp.net/discord-token)"));
		let token = GUI.newInput();
		token.value = this.getData("token");
		settings.appendChild(token);

		settings.appendChild(GUI.newDivider());

		// message
		settings.appendChild(GUI.newLabel("Message (use ${time} to denote where the time is)"));
		let message = GUI.newInput();
		message.value = this.getData("message");
		settings.appendChild(message);

		settings.appendChild(GUI.newDivider());

		// deadline
		settings.appendChild(GUI.newLabel("Deadline (in unix time)"));
		let deadline = GUI.newInput();
		deadline.setAttribute("type", "number");
		deadline.value = this.getData("deadline");
		settings.appendChild(deadline);

		settings.appendChild(GUI.newDivider());

		// Actions
		settings.appendChild(GUI.newDivider());
		let actions = GUI.newHBox();
		settings.appendChild(actions);

		let actionsRich = GUI.newHBox();

		// Append actions Rich after change edit mode
		actions.appendChild(GUI.newDivider());
		actions.appendChild(actionsRich);

		// Move save to the right
		actions.appendChild(GUI.setExpand(GUI.newDivider(), 2));

		let save = GUI.newButton("Save");
		GUI.setSuggested(save, true);
		actions.appendChild(save);
		save.onclick = () => {
			try {
				// Set Auth token
				this.setData("token", token.value);

				// Set message
				this.setData("message", message.value);

				// Set deadline
				this.setData("deadline", parseInt(deadline.value));
			}
			catch (e) {
				BdApi.showToast(e, {type: "error"});
				return;
			}

			// Show Toast
			BdApi.showToast("Settings were saved!", {type: "success"});

			// Restart
			this.stop();
			this.load();
			this.start();
		};

		// End
		return settings;
	}
}

/* Status API */
const Status = {
	authToken: "",

	request: () => {
		let req = new XMLHttpRequest();
		req.open("PATCH", "/api/v6/users/@me/settings", true);
		req.setRequestHeader("authorization", Status.authToken);
		req.setRequestHeader("content-type", "application/json");
		return req;
	},

	set: (status) => {
		let data = {};

		if (status.length == 0) return;
		if (status.length >= 1) data.text = status[0];
		if (status.length >= 2) data.emoji_name = status[1];
		if (status.length >= 3) data.emoji_id = status[2];

		Status.request().send(JSON.stringify({custom_status: data}));
	},

	unset: () => {
		Status.request().send('{"custom_status":null}');
	}
};

// Used to easily style elements like the 'native' discord ones
const GUI = {
	newInput: (text = "") => {
		let input = document.createElement("input");
		input.className = "inputDefault-_djjkz input-cIJ7To";
		input.innerText = text;
		return input;
	},

	newLabel: (text) => {
		let label = document.createElement("h5");
		label.className = "h5-18_1nd";
		label.innerText = text;
		return label;
	},

	// TODO: consider using margin / padding over minheight and width (or the appropriate html element)
	newDivider: (size = "15px") => {
		let divider = document.createElement("div");
		divider.style.minHeight = size;
		divider.style.minWidth = size;
		return divider;
	},

	newTextarea: () => {
		let textarea = document.createElement("textarea");
		textarea.className = "input-cIJ7To scrollbarGhostHairline-1mSOM1";
		textarea.style.resize = "vertical";
		textarea.rows = 4;
		return textarea;
	},

	newButton: (text, filled = true) => {
		let button = document.createElement("button");
		button.className = "button-38aScr colorBrand-3pXr91 sizeSmall-2cSMqn grow-q77ONN";
		if (filled) button.classList.add("lookFilled-1Gx00P");
		else button.classList.add("lookOutlined-3sRXeN");
		button.innerText = text;
		return button;
	},

	newHBox: () => {
		let hbox = document.createElement("div");
		hbox.style.display = "flex";
		hbox.style.flexDirection = "row";
		return hbox;
	},

	setExpand: (element, value) => {
		element.style.flexGrow = value;
		return element;
	},

	setSuggested: (element, value) => {
		if (value) element.classList.add("colorGreen-29iAKY");
		else element.classList.remove("mystyle");
		return element;
	},

	setDestructive: (element, value) => {
		if (value) element.classList.add("colorRed-1TFJan");
		else element.classList.remove("colorRed-1TFJan");
		return element;
	}
};