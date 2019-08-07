// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

///
/// This file contains the view model of the application
///
/// <reference path="lib/editor-framework.tsx" />
/// <reference path="lib/model.d.ts" />

/** The iframe in which vm.run() writes */
var getOutputPane = function() : HTMLIFrameElement {
	var outputPane = document.getElementById('outputPane') as HTMLIFrameElement;
	if(outputPane) { getOutputPane = function() { return outputPane; } }
	return outputPane;
}

/** The document representation of the output pane */
var getOutputPaneElement= function(): Element {
	if(!getOutputPane()) {
		var parser = new DOMParser();
		var doc = parser.parseFromString('', 'text/html');

		return doc.documentElement;
	}

	return getOutputPane().contentDocument.documentElement;
}

/** Helper to handle autofocus of dialogs */
function handleAutofocus(shouldGetFocus$: Prop<boolean>, element: HTMLElement) {
	if(shouldGetFocus$()) {
			
		var focusElement = (
			element.querySelector('[autofocus]') 
			|| element.querySelector('input,button,select,textarea,[tabindex]')
		) as HTMLElement;

		if(!focusElement) return; 
		
		setTimeout(time => focusElement.focus(), 16);
		setTimeout(time => focusElement instanceof HTMLInputElement && focusElement.select(), 16);
		shouldGetFocus$(false);

	}
}

/** The console pane (legacy code only) */
interface Window { jsPaneConsoleOutput?: HTMLPreElement }
function appendToConsole(logo, content) {
	var jsPaneConsoleOutput = window.jsPaneConsoleOutput;
	if(jsPaneConsoleOutput) {
		var textContent = convertObjectToDescription(content);
		var logoSpan = document.createElement("span"); {
			logoSpan.textContent = `${logo} `;
		}
		var contentSpan = document.createElement("span"); {
			contentSpan.textContent = textContent;
		}
		var entry = document.createElement("div"); {
			entry.title = textContent;
			entry.appendChild(logoSpan);
			entry.appendChild(contentSpan);
			entry.setAttribute('data-logo', logo);
		}
		jsPaneConsoleOutput.appendChild(entry);
		jsPaneConsoleOutput.scrollTop = jsPaneConsoleOutput.scrollHeight;
	}
}

/** Converts the javascript code of watches to standard javascript */
function expandShorthandsIn(jsCode: string): string {
	var describeCode = "(node => node.nodeName + (node.id ? '#' + node.id : '') + (node.classList.length ? '.' + node.classList[0] : ''))(";
	if("ActiveXObject" in window) { /* ie hack */ describeCode = "(function(node){ return node.nodeName + (node.id ? '#' + node.id : '') + (node.classList.length ? '.' + node.classList[0] : '') })("; }
	return (

		jsCode

		.replace(/^\$\$\(/g,'document.querySelectorAll(')
		.replace(/^\$\(/g,'document.querySelector(')
		.replace(/\b\$\$\(/g,'document.querySelectorAll(')
		.replace(/\b\$\(/g,'document.querySelector(')
		.replace(/(\;|\,|\(|\)|\+|\-|\*|\/|\=|\<|\>|\||\&|\\|\s)\$\$\(/g,'$1document.querySelectorAll(')
		.replace(/(\;|\,|\(|\)|\+|\-|\*|\/|\=|\<|\>|\||\&|\\|\s)\$\(/g,'$1document.querySelector(')

		.replace(/^eFP\(/g,'document.elementFromPoint(')
		.replace(/^eFP\b/g,'document.elementFromPoint.bind(document)')
		.replace(/\beFP\(/g,'document.elementFromPoint(')
		.replace(/\beFP\b/g,'document.elementFromPoint.bind(document)')


		.replace(/^gCS\(/g,'getComputedStyle(')
		.replace(/^gCS\b/g,'getComputedStyle.bind(window)')
		.replace(/^rAF\(/g,'requestAnimationFrame(')
		.replace(/^rAF\b/g,'requestAnimationFrame.bind(window)')
		.replace(/\bgCS\(/g,'getComputedStyle(')
		.replace(/\bgCS\b/g,'getComputedStyle.bind(window)')
		.replace(/\brAF\(/g,'requestAnimationFrame(')
		.replace(/\brAF\b/g,'requestAnimationFrame.bind(window)')

		.replace(/\.gBCW\(\)/g,'.getBoundingClientRect().width')
		.replace(/\.gBCH\(\)/g,'.getBoundingClientRect().height')
		.replace(/\.gBCL\(\)/g,'.getBoundingClientRect().left')
		.replace(/\.gBCT\(\)/g,'.getBoundingClientRect().top')
		.replace(/\.gBCR\(\)/g,'.getBoundingClientRect().right')
		.replace(/\.gBCB\(\)/g,'.getBoundingClientRect().bottom')

		.replace(/^describe\(/g, describeCode)
		.replace(/\bdescribe\(/g,describeCode)

	);
}

/** The data of the test being written (as ViewModel) */
var tm = m.addProps<TestDataModel,TestModel>({
	title: "UntitledTest",
	html: "",
	css: "",
	jsBody: "",
	jsHead: "",
	watches: [ ],
	watchValues: [],
	fileName: "testcase",
	filePath: ""
});

/** The data of the test being written (as JSON) */
var getTestData = () => {
	// get the data
	var tmData = tm.sourceModel;
	// sync the watchValues before returning the data
	tmData.watchValues = tmData.watches.map(expr => vm.watchExpectedValues[expr]);
	// return the data
	return tmData;
};

/** Script test constants */ 
const SCRIPT_TESTS = Object.freeze({
	STATUS: Object.freeze({
		PASS:0,
		FAIL:1,
		TIMEOUT:2,
		NOTRUN:3
	}),

	PHASE: Object.freeze({
		INITIAL:0,
		STARTED:1,
		HAS_RESULT:2,
		COMPLETE:3
	})
});

/** The data used to represent the current state of the view */
class ViewModel {

	// ===================================================
	// github state (readonly)
	// ===================================================

	githubUserData$ = cachedCast(() => document.cookie, cookie => {
		// read data from the user cookie (and trust it)
		var userCookie = decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent('user').replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || 'null'
		// parse that data into an object
		var user = null; try { user = JSON.parse(userCookie.substr(2,userCookie.length - 46)); } catch (ex) {};
		// return the result
		return user as {
			id: string | number,
			username: string,
			email: string,
			[propertyName: string]: any
		}
	})

	githubIsConnected$ = cachedCast(this.githubUserData$, user => !!user)
	githubUserName$ = cachedCast(this.githubUserData$, user => user ? user.username : "anonymous")
	githubUserId$ = cachedCast(this.githubUserData$, user => user ? user.id : null)
	githubUserEmail$ = cachedCast(this.githubUserData$, user => user ? user.email : null)

	// ===================================================
	// editor settings
	// ===================================================
	
	/** The id of the currently edited test */
	currentTestId$ = m.prop("new")

	/** The combined jsHead and jsBody */
	jsCombined$ = function(v?:string) {
		if(arguments.length == 0) {
			var jsHead = tm.jsHead;
			var jsBody = tm.jsBody;
			if(jsHead) {
				jsBody = '//<head>\r\n' + jsHead + '\r\n//</head>\r\n' + jsBody;
			}
			return jsBody;
		} else {
			var jsHead = '';
			var jsBody = v;
			jsBody = jsBody.replace(/^\/\/<head>\r\n((.|\r|\n)*)\r\n\/\/<\/head>\r\n/,function(m,code) {
				jsHead = code;
				return '';
			})
			tm.jsHead = jsHead;
			tm.jsBody = jsBody;
		}
	} as Prop<string>

	isHtmlPaneFocused$ = m.prop(false)
	isCssPaneFocused$ = m.prop(false)
	isJsPaneFocused$ = m.prop(false)

	// ===================================================
	// jsPane settings
	// ===================================================
	
	/** The id of the currently active tab */
	activeJsTab$ = m.prop('jsPaneWatches')

	// ===================================================
	// dom viewer settings
	// ===================================================

	/** The last time the DOM Viewer Tree was updated */
	lastDOMUpdateTime$ = m.prop(-1);

	/** The HTML text being displayed in the tree of the DOM Viewer */
	domViewerHTMLText$ = m.prop<string>("");

	/** Update sate management of the DOM Viewer tree */
	refreshDOMViewer() {
		this.domViewerHTMLText$(getOutputPaneElement().outerHTML);
		this.lastDOMUpdateTime$(performance.now());
	}

	// ===================================================
	// watch settings
	// ===================================================

	/** This value should be updated each time the watches are modified, and trigger their UI update */
	lastWatchUpdateTime$ = m.prop(-1);

	/** The readonly watches for the selected element */
	autoWatches = [
		"describe($0)",
		"$0.gBCW()",
		"$0.gBCH()",
		"gCS($0).display",
		"gCS($0).position",
		"gCS($0).marginLeft",
		"gCS($0).marginTop",
		"gCS($0).marginRight",
		"gCS($0).marginBottom",
		"gCS($0).borderLeftWidth",
		"gCS($0).borderTopWidth",
		"gCS($0).borderRightWidth",
		"gCS($0).borderBottomWidth",
		"gCS($0).paddingLeft",
		"gCS($0).paddingTop",
		"gCS($0).paddingRight",
		"gCS($0).paddingBottom",
		"describe($0.offsetParent)",
		"$0.offsetLeft",
		"$0.offsetTop",
	].concat((e => {

		var ds = Array.from(getComputedStyle(document.documentElement)).sort();
		return ds.map(prop => `gCS($0)['${prop}']`);

	})())

	/** Cache of the script test results */
	scriptTestResults$ = m.prop<Array<ScriptTestResultModel>>([])

	/** Determines whether the script test results should be visible */
	isScriptTestsVisible$ = m.prop<boolean>(true)
	setChangeInScriptTestVisibility(visible: boolean) {
		this.isScriptTestsVisible$(visible)
		this.lastWatchUpdateTime$(performance.now())
	}

	/** Metadata of all script test results */
	numberOfScriptTests$ = cachedCast(() => this.scriptTestResults$(), (tests: Array<ScriptTestResultModel>) => { return tests.length; } )
	numberOfSuccessfulScriptTests$ = cachedCast(() => this.scriptTestResults$(), (tests: Array<ScriptTestResultModel>) => { 
		return tests.reduce((c,t) => (c + (t.status === SCRIPT_TESTS.STATUS.PASS ? 1 : 0)), 0)
	})
	numberOfFailedScriptTests$ = cachedCast(() => this.scriptTestResults$(), (tests: Array<ScriptTestResultModel>) => {  
		return tests.reduce((c,t) => (c + (t.status === SCRIPT_TESTS.STATUS.PASS ? 0 : 1)), 0)
	})
	/** Cache of the values of the watches (as js object) */
	watchValues = Object.create(null) as { [key:string]: any }

	/** Cache of the values of the watches (as string) */
	watchDisplayValues = Object.create(null) as { [key:string]: string }

	/** Cache of the expected values of the watches (as js expressions) */
	watchExpectedValues = Object.create(null) as { [key:string]: string }
	setupExpectedValueFor(expr: string) {
		// get the current expected value if any
		var currentExpectedValue = this.watchExpectedValues[expr];
		// get the current watch value if any
		var currentWatchValue = ''; try { currentWatchValue = JSON.stringify(this.watchValues[expr]); } catch (ex) {}
		// now prompt for a new expected value
		var newValue = prompt("Please enter a javascript expression producing the expected value (leave empty to set none)", currentExpectedValue || currentWatchValue || '');
		// parse it into a form we can safely consider an expected value
		try {
			switch(newValue) {
				case null:
				case '':
				case 'true': case 'false':
				case 'null': case 'undefined': 
				case 'Number.NaN':
				case 'Number.POSITIVE_INFINITY': 
				case 'Number.NEGATIVE_INFINITY': 
				{
					// sounds good
					break;
				}
				default:
				{
					// then it needs to be some json
					newValue = JSON.parse(newValue);
					// type must be a primitive type so we can safely eval it anytime
					if(typeof(newValue) == 'string' || typeof(newValue) == 'number' || typeof(newValue) == 'boolean') {
						newValue = JSON.stringify(newValue);
					} else {
						throw new Error("Unsupported value; only primitive types are supported")
					}
				}
			}
		} catch (ex) {
			alert('Sorry, this value cannot be used as an expected value.\n\nOnly primitive types are supported.'); 
			console.error(ex);
			return;
		}
		// set this as the new expected value
		if(newValue) {
			this.watchExpectedValues[expr] = newValue;
		} else if (newValue === '') {
			delete this.watchExpectedValues[expr];
		} else {
			return; // because the user cancelled
		}
		// invalidate the current rendering (if necessary)
		vm.lastWatchUpdateTime$(performance.now());
		m.redraw();
	}

	/** Special flag map of watches to hide (because they have been pinned) */
	hiddenAutoWatches = Object.create(null) as { [key:string]: boolean }

	/** The text currently used as display-filter input for the watches */
	watchFilterText$ = m.prop<string>("")

	/** The actual test used as display-filter for the watches (readonly) */
	watchFilter$ = cachedCast(() => this.watchFilterText$(), (filterText:string) => {

		// if no text in the search box, every watch matches
		var isTextMatching = (expr:string) => true;

		// convert the text into a matcher
		if(filterText.length > 0) {

			// normal case = indexOf search
			var filterTextLC = filterText.toLowerCase();
			isTextMatching = expr => !!~expr.toLowerCase().indexOf(filterTextLC);

			// special case if regexp is typed
			if(filterText.indexOf('/') == 0) {
				var reg = null as RegExp;
				try { reg = reg || eval(filterText); } catch (ex) {}
				try { reg = reg || eval(filterText+'/i') } catch (ex) {}
				if(reg instanceof RegExp) {
					isTextMatching = expr => reg.test(expr);
				}
			}
		}

		// return the matcher
		return { matches: isTextMatching };

	})

	/** Fetches the testcases for the given user and  */
	fetchTestcasesByUser(author:string) {
		fetch(`/u/${author}`, {
			method: 'GET',
			credentials: "same-origin"
		}).then((response) => {
			response.text().then(text => {
				this.userTestcasesDialog.tests$(JSON.parse(text))
			})
		}).catch(ex => {
			console.error(ex);
			console.log(`Oops, something went wrong... Can't seem to get the tests created by ${author}.`);
		});
	}

	/** Deletes the test by the gievn id and author */
	deleteTestcase(author:string, id:string) {
		fetch(`/delete/t/${id}/${author}`, {
			method: 'DELETE',
			credentials: "same-origin"
		}).then((response) => {
			response.text().then(text => {
				alert(text);
				this.fetchTestcasesByUser(author)
			})
		}).catch(ex => {
			console.error(ex);
			alert("Oops, something went wrong... Try deleting the test again.");
		});
	}


	/** Adds an expression to the list of watches (eventually bootstrapped with a value) */
	addPinnedWatch(expr:string,value?) {

		// check that we have a base on which pinning this expression makes sense
		var processedExpression = expr;
		if(~expr.indexOf("$0")) {
			var w1 = window as any;
			if(!w1.$0) {
				// cannot pin an auto watch when no element is on the stack
				return;
			} else if(w1.$0replacement||w1.$0.id) {
				// we already know how to replace $0 by a stable expression
				processedExpression = processedExpression.replace(/\$0/g, w1.$0replacement||w1.$0.id);
			} else {
				// we need to show the dialog before replacing $0 by $0replacement
				var dialog = this.selectorGenerationDialog;
				dialog.watchExpression$(expr);
				dialog.watchValue$({ defined: arguments.length >= 2, value: value });
				dialog.autoId$(w1.$0.sourceTagId||'');
				dialog.chosenMode$(w1.$0.sourceTagId ? 'id' : 'selector')
				dialog.chosenId$(w1.$0.sourceTagId||'');
				dialog.chosenSelector$(buildSelectorFor(w1.$0));
				dialog.open();
				return;
			}
		}

		// if we were given a fake element as $0, we need to delete it before running the watches
		if(w1 && w1.$0 && 'id' in w1.$0 && !('nodeName' in w1.$0)) window['$0'] = undefined;

		// actually pin this expresion now that the safety checks have run
		tm.watches.push(processedExpression);
		if(arguments.length >= 2) {

			// a value was provided for us, let's use it
			vm.watchValues[processedExpression] = value;
			vm.watchDisplayValues[processedExpression] = `${value}`; // TODO

		} else if(expr in vm.watchValues) {

			// we just pinned some auto watch
			vm.watchValues[processedExpression] = vm.watchValues[expr];
			vm.watchDisplayValues[processedExpression] = vm.watchDisplayValues[expr];
			vm.hiddenAutoWatches[expr] = true;

		} else {

			// we have no recollection of this watch, recompute everything
			vm.refreshWatches();

		}
		this.lastWatchUpdateTime$(performance.now());
	}

	/** Removes an expression from the list of watches */
	removePinnedWatch(expr:string) {
		var index = tm.watches.indexOf(expr);
		if(index >= 0) {
			tm.watches.splice(index,1);
		}
		this.lastWatchUpdateTime$(performance.now());
	}

	/** Recomputes the values and display values of watches */
	refreshWatches(elm?: Element) {

		// possibly push elm on the stack of selected elements
		if(elm) {
			var w1 = window as any;
			var w2 = getOutputPane().contentWindow as any;
			w2.$9 = w1.$9 = w1.$8;
			w2.$8 = w1.$8 = w1.$7;
			w2.$7 = w1.$7 = w1.$6;
			w2.$6 = w1.$6 = w1.$5;
			w2.$5 = w1.$5 = w1.$4;
			w2.$4 = w1.$4 = w1.$3;
			w2.$3 = w1.$3 = w1.$2;
			w2.$2 = w1.$2 = w1.$1;
			w2.$1 = w1.$1 = w1.$0;
			w2.$0 = w1.$0 = elm;
			w1.$0replacement = undefined;
		}

		// reset state
		this.watchValues = Object.create(null) as any;
		this.watchDisplayValues = Object.create(null) as any;
		this.hiddenAutoWatches = Object.create(null) as any;

		// evalute the watches
		var w1 = window as any;
		var w2 = getOutputPane().contentWindow as any;
		for(var expr of [...tm.watches,...vm.autoWatches]) {
			var result = ''; 
			if(expr && (w1.$0 || !~expr.indexOf("$0"))) {
				try { result = w2.eval(expandShorthandsIn(expr)); }
				catch (ex) { result = '!!!' + (ex.message ? ex.message : `${ex}`); }
			}

			// output the current value
			vm.watchValues[expr] = result;
			vm.watchDisplayValues[expr] = `${result}`; // TODO
		}
		
		this.lastWatchUpdateTime$(performance.now());
	}

	// ===================================================
	// general dialog settings
	// ===================================================

	isAnyDialogOpen$() {
		for(var key in this) {
			var this_key = this[key];
			if(this_key instanceof DialogViewModel) {
				if(this_key.isOpened$()) {
					return true;
				}
			}
		}
		return false;
	}

	closeAllDialogs() {
		for(var key in this) {
			var this_key = this[key];
			if(this_key instanceof DialogViewModel) {
				this_key.close()
			}
		}
	}

	// ===================================================
	// watch replacement dialog
	// ===================================================
	
	welcomeDialog = new WelcomeDialogViewModel(this)

	// ===================================================
	// watch replacement dialog
	// ===================================================
	
	searchDialog = new SearchDialogViewModel(this)

	// ===================================================
	// watch replacement dialog
	// ===================================================
	
	selectorGenerationDialog = new SelectorGenerationDialogViewModel(this)

	// ===================================================
	// settings dialog
	// ===================================================
	
	settingsDialog = new SettingsDialogViewModel(this)

	/** Removes the user cookie */
	logOut() {
		document.cookie = 'user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
		redrawIfReady();
	}

	/** Redirects to the login page */
	logIn() {
		var currentId = this.currentTestId$();
		if(currentId != 'local:save' && currentId != 'new') {
			sessionStorage.setItem('local:save', currentId);
		}
		location.href = '/login/github/start';
	}

	// ===================================================
	// deleted user dialog
	// ===================================================

	deletedUserDialog = new DeletedUserDialogViewModel(this)

	/** Deletes the user from the app and logs them out */
	deleteUser() {
		fetch('/delete/u', {
			method: 'DELETE',
			credentials: "same-origin"
		}).then((response) => {
			response.text().then(text => {
				this.deletedUserDialog.deletedUser$(this.githubUserName$())
				this.deletedUserDialog.newAnonymousUser$(text)

				this.logOut();
			})
		}).catch(ex => {
			console.error(ex);
			alert("Oops, something went wrong... Try deleting your account again.");
		});
	}

	// ===================================================
	// user testcases dialog
	// ===================================================

	userTestcasesDialog = new UserTestcasesDialogViewModel(this)

	// ===================================================
	// export testcases dialog
	// ===================================================

	exportDialog = new ExportDialogViewModel(this)

	// ===================================================
	// output frame settings
	// ===================================================
	
	/** Whether the mouse is being tracked to select a new element */
	isPicking$ = m.prop(false)

	/** The currently to-be-selected element under the mouse */
	selectedElement$ = m.prop<Element>(null)

	/** Whether a line jump is advised in the html editor */
	shouldMoveToSelectedElement$ = m.prop(false);

	/** The mapping between current source lines and source lines at the time of the last run */
	lineMapping = [0]

	/** How many source lines the current run had */
	lineMappingLineCount = 1

	/** Cache of the auto-generated IDs, for cleaning purpose */
	idMappings = new Set<string>()

	/** Refreshes the output frame with the latest source code */
	run() {

		// hide outdated element outline
		this.isPicking$(false);
		this.selectedElement$(null);
		if(window.jsPaneConsoleOutput) { 
			window.jsPaneConsoleOutput.innerHTML = '';
		}

		// bail out if we don't have loaded yet
		var outputPane = getOutputPane();
		if(!outputPane) {
			setTimeout(x => this.run(), 100);
			return;
		}

		// remove any $ values since we are going to clear the inner document
		var w1 = window as any;
		var w2 = outputPane.contentWindow as any;
		var recoverableElements = [] as Element[];
		w1.$0replacement = undefined;
		for(var i = 10; i--;) {
			recoverableElements.unshift(w1['$'+i]);
			w1['$'+i] = w2['$'+i] = undefined;
		}
		this.idMappings.forEach(id => {
			w2[id] = undefined;
		});
		this.idMappings.clear();

		// extract the doctype, if any (default to html5 doctype)
		var doctype = "<!doctype html>";
		var html = tm.html.replace(/<!doctype .*?>/gi, function(value) {
			doctype = value; return '';
		});
		
		// generate new document
		var d = outputPane.contentWindow.document;
		d.open();
		d.write(doctype);

		// prepare the console hooks
		outputPane.contentWindow.console.debug = function(...args) {
			args.forEach(arg => appendToConsole('-', arg));
			console.debug.apply(console,args);
		};
		outputPane.contentWindow.console.log = function(...args) {
			args.forEach(arg => appendToConsole('-', arg));
			console.log.apply(console,args);
		};
		outputPane.contentWindow.console.dir = function(...args) {
			args.forEach(arg => appendToConsole('-', arg));
			console.dir.apply(console,args);
		};
		outputPane.contentWindow.console.info = function(...args) {
			args.forEach(arg => appendToConsole('i', arg));
			console.info.apply(console,args);
		};
		outputPane.contentWindow.console.warn = function(...args) {
			args.forEach(arg => appendToConsole('!', arg));
			console.warn.apply(console,args);
		};
		outputPane.contentWindow.console.error = function(...args) {
			args.forEach(arg => appendToConsole('‼️', arg));
			console.error.apply(console,args);
		};

		// write the document content
		d.write("<title>" + tm.title.replace(/</g,"&lt;").replace(/>/g,"&gt;") + "</title>");
		d.write("<script>" + tm.jsHead + '<' + '/script> <script src="bin/testharness.js"><' + '/script>');
		d.write("<style>" + tm.css + "</style>");
		
		attributeLines(0);
		var htmlLines = html.split("\n");
		for(var lineIndex = 0; lineIndex < htmlLines.length;) {
			d.writeln(htmlLines[lineIndex]);
			attributeLines(++lineIndex);
		}
		
		d.write("<script>" + tm.jsBody + "<" + "/script>");
		
		d.close();
		
		// reset the line mapping
		vm.lineMapping = htmlLines.map((l,i) => i);
		vm.lineMappingLineCount = htmlLines.length;
		
		// create short names for all elements without custom id
		attributeIds(this)

		// recover $0/1/... values if we can
		for(var i = 10; i--;) {
			var elm = recoverableElements[i];
			if(elm) {
				try {
					if(elm.id) {
						w1['$'+i] = w2['$'+i] = w2.document.getElementById(elm.id);
					} else if (elm.sourceLine) {
						// TODO: try to match elements by sourceLine and tagName
					}
				} catch (ex) {
					w1['$'+i] = w2['$'+i] = null;
				}
			}
		}
		
		// rerun the watches and refresh DOM viewer
		this.refreshWatches();
		this.refreshDOMViewer();
		
		//-------------------------------------------------------
		
		/** Detects newly inserted elements and note which html line generated them */
		function attributeLines(lineIndex) {
			for(var i = d.all.length; i--;) {
				if(d.all[i].sourceLine == undefined) {
					d.all[i].sourceLine = lineIndex;
				} else {
					break;
				}
			}
		}
		
		/** Creates global variables to easily access nodes without id */
		function attributeIds(vm: ViewModel) {
			var tagCounters = Object.create(null);
			for(var i = 0; ++i < d.all.length;) {
				var el = d.all[i];
				if(el.sourceLine > 0 && el != d.body) {
					var tagCounter = tagCounters[el.tagName] = 1 + (tagCounters[el.tagName]|0);
					if(!el.id) {
						var tagId = el.tagName.toLowerCase() + tagCounter;
						if(!getOutputPane().contentWindow[tagId]) {
							getOutputPane().contentWindow[tagId] = el;
							el.sourceTagId = tagId;
							vm.idMappings.add(tagId);
							console.log(tagId, el);
						}
					}
				}
			}
		}
	}

	/** Saves the test in a json url */
	saveInUrl() {
		suspendRedrawsOn(redraw => {
			location.hash = "#/json:" + encodeHash(JSON.stringify(getTestData()));
			vm.currentTestId$(location.hash.substr(2));
			redraw();
			// pad has no easy-to-use address bar, so provide an easy source to copy the url:
			if(window.external && "DoEvents" in window.external) {
				prompt("Copy the url from here:", location.href);
			}
		})
	}

	/** Saves the test model in the localStorage */
	saveLocally() {
		
		var data = getTestData();

		var id = '';
		var idLetters = 'abcdefghijklmnopqrstuvwxyz0123456789';
		for(var i = 5; i--;) {
			id += idLetters[Math.floor(Math.random() * idLetters.length)];
		}

		sessionStorage.setItem('local:save', 'local:' + id);
		localStorage.setItem('local:' + id, JSON.stringify(data));
		localStorage.setItem('local:save', localStorage.getItem('local:' + id)); // in case the session gets lost
		suspendRedrawsOn(redraw => {
			this.currentTestId$("local:" + id);
			location.hash = "#/local:" + id;
			redraw();
		})
	}

	/** Saves the test model on the server */
	saveOnline() {
		// ensure test case title:
		if(!tm.title || tm.title == "UntitledTest") {
			try {
				tm.title = prompt("Enter a title for your test (pressing cancel will abort save)", tm.title);
				if(tm.title == null) {
					tm.title = "UntitledTest";
					return;
				}
			} catch (ex) {
				// do nothing
			}
		}
		// ensure the user is connected
		if(!this.githubIsConnected$()) {
			this.saveLocally();
			alert(`You are about to be redirected to the login page. Your current work has been saved locally with id ${sessionStorage.getItem('local:save')}, and will be recovered after you log in.`);
			this.settingsDialog.logIn();
			return;
		}
		// upload the testcase data
		var data = getTestData();
		fetch('/new/testcase/', {
			method: 'POST', 
			body: JSON.stringify(data),
			credentials: "same-origin"
		}).then(r => r.json()).then(o => {

			sessionStorage.removeItem('local:save');
			localStorage.removeItem('local:save');
			suspendRedrawsOn(redraw => {
				
				// update the data
				this.currentTestId$(o.id);
				this.updateURLForTest();

				// refresh the iframe and view
				this.run();

				// remove suspender
				redraw();

			})

		}).catch(ex => {
			console.error(ex);
			alert("Oops, something went wrong... Try again or save locally by pressing ALT when you click on the save button.");
		});
	}

	/** Whether the test model is still waiting on some data from the server */
	isLoading$ = m.prop(false)

	/** Redirects the page to have the specified user's testcases in an dialog open */
	redirectToUsersTests(author: string) {
		this.userTestcasesDialog.previousUrl$(location.hash)
		history.replaceState(getTestData(), `Tests by ${this.githubUserName$()}`, `/#/u/${this.githubUserName$()}`)
	}

	/** Closes the testcases dialog and redirects back to the previous page */
	redirectBackFromUsersTests() {
		history.replaceState(getTestData(), document.title, this.userTestcasesDialog.previousUrl$());
		updatePageTitle()
	}

	/** Resets the test model based on new data */
	openFromJSON(newData?: TestDataModel) {
		this.isLoading$(false);
		this.watchValues = Object.create(null);
		this.watchDisplayValues = Object.create(null);
		this.watchExpectedValues = Object.create(null);
		Object.assign<TestDataModel,TestDataModel>(tm.sourceModel, {
			title: 'UntitledTest',
			html: '',
			css: '',
			jsHead: '',
			jsBody: '',
			watches: [],
			watchValues: [],
			fileName: 'testcase',
			filePath: '',
		});
		if(newData) {
			Object.assign<TestDataModel,TestDataModel>(tm.sourceModel, newData);
			if(newData.watchValues && newData.watchValues.length) {
				for(var i = newData.watchValues.length; i--;) {
					this.watchExpectedValues[newData.watches[i]] = newData.watchValues[i];
				}
			}
		}
		this.updateURLForTest();
		this.run();
	}

	/** Updates url and page title on test id change */
	updateURLForTest() {
		updatePageTitle();
		location.hash = '#/' + vm.currentTestId$();
		history.replaceState(getTestData(), document.title, location.href); // TODO: clone
	}

	/** Exports the test into a web platform test and return the file content as string */
	saveToFileString() {
		var html = '';
		function ln(...args) { html += (html ? '\n' : '') + (String.raw as any)(...args); }
		
		// extract the doctype, if any (default to html5 doctype)
		var doctype = "<!doctype html>";
		var tm_html = tm.html.replace(/<!doctype .*?>\s*\r?\n?/gi, function(value) {
			doctype = value.trim(); return '';
		}).trim();	
		
		// start the document
		ln`${doctype}`;

		// ensure test case title:
		if(tm.title) {
			ln`<title>${tm.title.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</title>`;
		} else {
			ln`<title>UntitledTest</title>`;
		}

		// ensure test case harness:
		var pathToHarness = "/resources/";
		ln`<script src="${pathToHarness}testharness.js"></script>`;
		ln`<script src="${pathToHarness}testharnessreport.js"></script>`;

		// append the test case itself
		if(tm.jsHead) {
			ln`<script>${"\n\n"+tm.jsHead+"\n\n"}</script>`;
		}
		if(tm.css) {
			ln`<style>${"\n\n"+tm.css+"\n\n"}</style>`;
		}
		if(tm_html) {
			ln``;
			ln`${tm_html}`;
			ln``;
		}
		if(tm.jsBody) {
			ln`<script>${"\n\n"+tm.jsBody+"\n\n"}</script>`;
		}
		if(Array.from(tm.watches).length > 0 || !tm.jsBody) {
			ln`<script>
var test_description = document.title;
promise_test(
	t => {
		return new Promise(test => addEventListener('load', e=>test()))
		${
			Array.from(tm.watches).map(
				expr => ({
					expression: expr,
					jsValue: vm.watchValues[expr]
				})
			).filter(
				w => !!w.expression
			).map(
				w => 
				`.then(test => assert_equals(${
					expandShorthandsIn(w.expression)
				}, ${
					JSON.stringify(w.jsValue)
				}, ${
					JSON.stringify(`Invalid ${w.expression};`)
				}))`
			).join('\n\t\t')
		}
	},
	test_description
);
</script>`;
	}
		return html;
	}

	/** Exports the test into a web platform test and initiate a download */
	saveToFile() {
		var html = this.saveToFileString();
		var blob = new Blob([html], { type: 'text/html' });
		var url = URL.createObjectURL(blob);
		var a = document.createElement("a");
		var fileName = (tm.fileName || "testcase");
		if(!/[.](html|htm|xht|xhtml)$/i.test(fileName)) { fileName += '.html'; }
		a.setAttribute("download", fileName);
		a.href = url;
		a.click();
		setTimeout(x => URL.revokeObjectURL(url), 10000);
	}
}

abstract class DialogViewModel {

	/** The attached view model */
	vm = null as ViewModel;
	constructor(vm: ViewModel) {
		this.vm = vm;
	}

	/** Whether the dialog is opened or closed */
	isOpened$ = m.prop(false)

	/** Whether the dialog should get focus */
	shouldGetFocus$ = m.prop(false)

	/** Opens the dialog */
	open() {
		this.isOpened$(true);
		this.shouldGetFocus$(true);
	}

	/** Closes the dialog */
	close() {
		this.isOpened$(false);
		this.shouldGetFocus$(false);
	}

}

class SelectorGenerationDialogViewModel extends DialogViewModel {

	/** The raw watch expression we want to pin */
	watchExpression$ = m.prop("")

	/** Its precomputed value, in case one was given */
	watchValue$ = m.prop({ defined: false, value: undefined as any })

	/** The id auto-generated for the element, if any */
	autoId$ = m.prop("")

	/** Whether there is an auto-generated id (readonly) */
	isAutoAvailable$ = cachedCast(this.autoId$, x => !!x)

	/** The mode chosen by the user */
	chosenMode$ = m.prop<"auto"|"id"|"selector">("auto")

	/** The id the user typed in the text box (id mode) */
	chosenId$ = m.prop("")

	/** The selector the user typed in the text box (selector mode) */
	chosenSelector$ = m.prop("")

}

class SettingsDialogViewModel extends DialogViewModel {

	/** Whether the dialog is opened or closed */
	isOpened$ = m.prop(false)

	/** Cache for useMonaco$() */
	private intenal_useMonaco : boolean;

	/** Whether to use Monaco on this device or not */
	useMonaco$ = m.prop2(
		(v) => {
			if(typeof(this.intenal_useMonaco) == 'undefined') {
				this.intenal_useMonaco = !localStorage.getItem('noMonaco')
			}
			return this.intenal_useMonaco;
		},
		(v) => {
			this.intenal_useMonaco = !!v;
			localStorage.setItem('noMonaco', v?'':'true')
		}
	);

	/** Ask the viewmodel to log the user out */
	logOut() {
		this.vm.logOut();
	}

	/** Ask the viewmodel to log a user in */
	logIn() {
		this.vm.logIn();
	}

	/** Ask the viewmodel to delete this user */
	deleteUser() {
		this.vm.deleteUser();
	}

	/** Open the welcome dialog */
	openWelcomeDialog() {
		this.vm.welcomeDialog.open();
	}

	/** Open the search dialog */
	openSearchDialog() {
		this.vm.searchDialog.open();
	}
}

class DeletedUserDialogViewModel extends DialogViewModel {
	/** The user that ws deleted */
	deletedUser$ = m.prop("")

	/** The username of the anonymous user name assigned to the tests from the deleted user */
	newAnonymousUser$ = m.prop("")
}

class UserTestcasesDialogViewModel extends DialogViewModel {
	constructor(vm: ViewModel) {
		super(vm);
		this.author$(vm.githubUserName$())
		this.previousUrl$("/#/new")
	}

	/** The author to display the tests of */
	author$ = m.prop("")

	/** The tests created by this author */
	tests$ = m.prop([])

	/** The previous URL that was open to return to */
	previousUrl$ = m.prop("")

	updateAuthorOfTestcases(author: string) {
		this.author$(author)
		this.vm.fetchTestcasesByUser(author)
	}

	deleteTest(id: string) {
		this.vm.deleteTestcase(this.author$(), id)
	}
}

class WelcomeDialogViewModel extends DialogViewModel {
	constructor(vm: ViewModel) {
		super(vm);
		if(location.hash == '' || location.hash == '#/new') {
			if(!localStorage.getItem('noWelcome') && !vm.githubIsConnected$()) {
				this.open();
			} else {
				localStorage.setItem('noWelcome', 'true');
			}
		} else {
			localStorage.setItem('noWelcome', 'true');
		}
	}
}

class SearchDialogViewModel extends DialogViewModel {
	/** The text that is being searched */
	searchTerms$ = m.prop("")

	/** The text that is being searched */
	searchUrl$ = m.prop("about:blank")

	/** Opens the dialog */
	open() {
		if(!this.isOpened$()) {
			this.searchTerms$("");
			this.searchUrl$("about:blank");
			this.isOpened$(true);
		}
		this.shouldGetFocus$(true);
	}
}

class ExportDialogViewModel extends DialogViewModel {
	/** The title of the test */
	title$ = m.prop("UntitledTest")

	/** The file name of the test */
	fileName$ = m.prop("testcase")

	/** The path to the spec's test folder */
	filePath$ = m.prop("")

	/** Opens the dialog */
	open(tm?: TestModel) {
		if(!this.isOpened$()) {
			this.title$("UntitledTest");
			this.fileName$("testcase");
			this.filePath$("");
			this.isOpened$(true);
		}
		this.shouldGetFocus$(true);
		if(tm) {
			this.importValues(tm);
		}
	}

	/** Import the values from the global scope */
	importValues(tm: TestModel) {
		this.title$(tm.title$());
		this.fileName$(tm.fileName$());
		this.filePath$(tm.filePath$());
	}

	/* Export the values from the global scope */
	exportValues(tm: TestModel) {
		tm.title$(this.title$());
		tm.fileName$(this.fileName$());
		tm.filePath$(this.filePath$());
	}
	
}

var vm = new ViewModel();