// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/// <reference path="wptest-vm.tsx" />

var Input = new Tag <{ value$:Prop<string> } & JSX.IntrinsicInputElement> ().from(a=>
	<input {...attributesOf(a)} value={a.value$()} oninput={bindTo(a.value$)} onchange={bindTo(a.value$)} />
);

var InputCheckbox = new Tag <{ value$:Prop<boolean> } & JSX.IntrinsicInputElement> ().from(a=>
	<input type="checkbox" {...attributesOf(a)} checked={a.value$()} onchange={bindTo(a.value$,"checked")} />
);

var InputRadio = new Tag <{ value:string, checkedValue$:Prop<string> } & JSX.IntrinsicInputElement> ().from(a=>
	<input type="radio" {...attributesOf(a)} checked={a.checkedValue$()==a.value} onchange={bindTo(a.checkedValue$)} />
);

var TextArea = new Tag <{ value$:Prop<string> } & JSX.IntrinsicElement> ().from(a=>
	<textarea {...attributesOf(a)} oninput={bindTo(a.value$)} onchange={bindTo(a.value$)} >{a.value$()}</textarea>
)

var BodyToolbar = new Tag <{ model:TestModel }> ().from(a =>
	<body-toolbar row role="toolbar">
		<button onclick={e=>vm.run()} title="Move your code to the iframe">Run</button>
		<button onclick={e=>{if(e.shiftKey) { vm.saveInUrl() } else if(e.altKey) { vm.saveLocally() } else { vm.saveOnline() }}} title="Save your test online (Shift: url, Alt: local storage)">Save</button>
		<button onclick={e=>vm.saveToFile()} title="Download as a weplatform test case">Export</button>
		<button onclick={e=>vm.settingsDialog.isOpened$(true)} title="Open the settings dialog">⋅⋅⋅</button>
		<hr style="visibility: hidden; flex:1 0 0px;" />
		<Input value$={a.model.title$} title="Title of your test case" />
	</body-toolbar>
);

interface MonacoTextEditorState { editor:monaco.editor.IStandaloneCodeEditor, value:string, isDirty:boolean }
var MonacoTextEditor = new Tag <{ id:string, value$:Prop<string>, language:string, isFocused$?: Prop<boolean> }, MonacoTextEditorState> ().with(
	{
		oncreate(this: MonacoTextEditorState, node: M.VirtualNode) {

			// set default state values
			this.editor = null;
			this.value = node.attrs.value$();
			this.isDirty = false;

			// wait for monaco to load if needed
			if(localStorage.getItem('noMonaco')) return;
			require(['vs/editor/editor.main'], then => {
				
				// create the text editor, and save it in the state
				this.value = node.attrs.value$();
				this.isDirty = false;
				let editor = this.editor = monaco.editor.create(document.getElementById(node.attrs.id+'Area'), {
					value: this.value,
					fontSize: 13,
					lineNumbers: "off",
					scrollbar: {
						useShadows: false,
						verticalHasArrows: false,
						horizontalHasArrows: false,
						vertical: 'hidden',
						horizontal: 'hidden',
						verticalScrollbarSize: 0,
						horizontalScrollbarSize: 0,
						arrowSize: 0
					},
					language: node.attrs.language,
				});
				this.editor.updateOptions({
					acceptSuggestionOnEnter: false,
				});
				this.editor.getModel().updateOptions({ 
					insertSpaces: false, 
					tabSize: 4,
				});

				// register to some events to potentially update the linked value
				this.editor.getModel().onDidChangeContent(e => {
					if(this.editor.isFocused()) {
						this.isDirty = true;
						redrawIfReady();
					}
				});

				this.editor.onDidFocusEditor(() => {
					if(node.attrs && node.attrs.isFocused$) {
						node.attrs.isFocused$(true);
						redrawIfReady();
					}
				});

				this.editor.onDidBlurEditor(() => {
					if(node.attrs && node.attrs.isFocused$) {
						node.attrs.isFocused$(false);
						redrawIfReady();
					}
				});

				// register to the window resize event, and relayout if needed
				window.addEventListener('resize', x => {
					this.editor.layout();
				});

				// hookup language-specific things
				switch(node.attrs.language) {
					case "html": {

						this.editor.getModel().onDidChangeContent(e => {
							
							var oldLineCount = 1 + e.range.endLineNumber - e.range.startLineNumber;
							var newLineCount = countLines(e.text);
							var deltaLineCount = (newLineCount - oldLineCount);
							var totalLineCount = countLines(editor.getValue());
							var newLineMapping = new Array(totalLineCount);
							for(var x = 0; x<totalLineCount; x++) {
								if(x < e.range.startLineNumber) {
									newLineMapping[x] = crossMappingHelper(x);
								} else if(x < e.range.startLineNumber + newLineCount - 1) {
									newLineMapping[x] = crossMappingHelper(e.range.startLineNumber-1);
								} else {
									newLineMapping[x] = crossMappingHelper(x - deltaLineCount);
								}
							}
							vm.lineMapping = newLineMapping;
							
							function countLines(txt) {
								return txt.split(/\n/g).length;
							}
							
							function crossMappingHelper(x) {
								if(x < vm.lineMapping.length) {
									return vm.lineMapping[x];
								} else {
									return vm.lineMappingLineCount-1;
								}
							}
							
						});

						this.editor.addAction({
							id: 'wpt-inspect',
							label: 'Inspect this element',
							contextMenuGroupId: 'navigation',
							contextMenuOrder: 0,
							run() {
								var sourceLine = 1+vm.lineMapping[editor.getPosition().lineNumber-1];
								var w = getOutputPane().contentWindow;
								var d = getOutputPane().contentDocument;
								for(var i = 0; i<d.all.length; i++) {
									var elm = d.all[i];
									if(elm.sourceLine == sourceLine && elm != d.body) {
										vm.selectedElement$(elm);
										vm.refreshWatches(elm);
										return;
									}
								}
								vm.selectedElement$(undefined);
								vm.refreshWatches();
							}
						});
						break;
					}
					case "css": {

						this.editor.addAction({
							id: "lookup-on-csswg",
							label: "Search on csswg.org",
							contextMenuGroupId: 'navigation',
							contextMenuOrder: 0,
							run() {
								var word = editor.getModel().getWordAtPosition(editor.getPosition()).word;
								window.open("http://bing.com/search?q=" + word + " site:drafts.csswg.org");
							}
						});
						
						this.editor.addAction({
							id: "lookup-on-msdn",
							label: "Search on MSDN",
							contextMenuGroupId: 'navigation',
							contextMenuOrder: 0.1,
							run() {
								var word = editor.getModel().getWordAtPosition(editor.getPosition()).word;
								window.open("http://bing.com/search?q=" + word + " property site:msdn.microsoft.com");
							}
						});
						
						this.editor.addAction({
							id: "lookup-on-mdn",
							label: "Search on MDN",
							contextMenuGroupId: 'navigation',
							contextMenuOrder: 0.2,
							run() {
								var word = editor.getModel().getWordAtPosition(editor.getPosition()).word;
								window.open("http://bing.com/search?q=" + word + " css site:developer.mozilla.org ");
							}
						});
						
						this.editor.addAction({
							id: "cssbeautify",
							label: "Beautify the code",
							contextMenuGroupId: 'navigation',
							contextMenuOrder: 0.3,
							run() {
								editor.setValue(cssbeautify(editor.getValue(), { indent:'\t' }));
								editor.focus();
							}
						});

						break;
					}
					case "javascript": {

						// TODO
						// Add the model of builtin functions?
						// And of generated IDs?
						break;
					}
				}

				// eventually recover current textbox focus state
				let linkedTextbox = document.getElementById(node.attrs.id+"Textbox") as HTMLTextAreaElement;
				if(document.activeElement === linkedTextbox) {
					let startPos = linkedTextbox.selectionStart;
					let endPos = linkedTextbox.selectionEnd;
					if(startPos > 0 || endPos > 0) {
						let startLine = 0, startPosInLine = startPos;
						let endLine = 0, endPosInLine = endPos;
						var lines = linkedTextbox.value.split(/\n/g);
						while(startPosInLine > lines[startLine].length) {
							startPosInLine -= lines[startLine].length + 1;
							startLine++;
						}
						while(endPosInLine > lines[endLine].length) {
							endPosInLine -= lines[endLine].length + 1;
							endLine++;
						}
						this.editor.setSelection(new monaco.Range(1+startLine, 1+startPosInLine, 1+endLine, 1+endPosInLine));
					}
					this.editor.focus();
				}
				redrawIfReady();

			});

		},
		
		onbeforeupdate(this: MonacoTextEditorState, node: M.VirtualNode, oldn: M.VirtualNode) {

			// verifies that we have a text control to work with
			if(!this.editor) return;

			// verifies whether we need to change the text of the control
			var theNewValue$ = node.attrs["value$"];
			var theNewValue = theNewValue$();
			var cantForciblyUpdate = () => (
				this.editor.isFocused() 
				&& this.value 
				&& theNewValue
			);
			if(theNewValue != this.value && !cantForciblyUpdate()) {

				// there was a model update
				this.isDirty = false;
				this.editor.setValue(this.value = theNewValue);

				// in this case, stop tracking the line mapping
				if(node.attrs.language === 'html') {
					vm.lineMapping = this.value.split(/\n/g).map(l => 0);
					vm.shouldMoveToSelectedElement$(false);
				}

			} else if(this.isDirty) {

				// there was a content update
				theNewValue$(this.value = this.editor.getValue());
				requestAnimationFrame(time => m.redraw());
				this.isDirty = false;

			} else {

				// no update
				
			}

			// check whether we should move the cursor as requested by the view model
			if(vm.shouldMoveToSelectedElement$()) {
				vm.shouldMoveToSelectedElement$(false); // only one editor should take this

				var elm = vm.selectedElement$();
				var column = 0; 
				try { column = this.editor.getValue().split(/\n/g)[elm.sourceLine-1].match(/^\s+/)[0].length; } catch (ex) {}
				this.editor.revealLineInCenterIfOutsideViewport(elm.sourceLine);
				this.editor.setPosition({lineNumber:elm.sourceLine, column:1+column});
				this.editor.focus();

			}

		}
	}
).from((a,c,s) =>
	<monaco-text-editor id={a.id} language={a.language}>
		<monaco-text-editor-area id={a.id+'Area'} />
		<TextArea id={a.id+'Textbox'} value$={a.value$} hidden={!!s.editor} onkeydown={enableTabInTextarea} />
		<monaco-text-editor-placeholder hidden={a.value$().length>0}>{(
			{
				'javascript': '// JAVASCRIPT CODE',
				'html': '<!-- HTML MARKUP -->',
				'css': '/* CSS STYLES */'
			}[a.language] || '')
		}</monaco-text-editor-placeholder>
	</monaco-text-editor>
);

function enableTabInTextarea(e) {
	// tab but not ctrl+tab
	if(e.ctrlKey || e.altKey) return;
	if(e.keyCode==9 || e.which==9){
		e.preventDefault();
		var s = this.selectionStart;
		this.value = this.value.substring(0,this.selectionStart) + "\t" + this.value.substring(this.selectionEnd);
		this.selectionStart = this.selectionEnd = s+1; 
		this.onchange(e);
	}}

var TabButton = new Tag <{ pane:string, activePane$: Prop<string> } & JSX.IntrinsicElement> ().from((a,c)=>
	<button {...attributesOf(a)} onclick={e=>a.activePane$(a.pane)} aria-controls={a.pane} aria-expanded={`${a.pane==a.activePane$()}`}>{c}</button>
);

var ToolsPaneToolbar = new Tag <{ activePane$:Prop<string> }> ().from(a=>
	<tools-pane-toolbar row aria-controls={a.activePane$()} role="toolbar">
		<TabButton pane="jsPaneWatches" activePane$={a.activePane$}>Watches</TabButton>
		<TabButton pane="jsPaneConsole" activePane$={a.activePane$}>Console</TabButton>
		<TabButton pane="jsPaneHeadCode" activePane$={a.activePane$}>Header code</TabButton>
		<TabButton pane="jsPaneBodyCode" activePane$={a.activePane$}>Body code</TabButton>
	</tools-pane-toolbar>
);

var ToolsPaneWatches = new Tag <{ id:string, activePane$:Prop<string> }> ().with({
	onbeforeupdate() {
		var lastWatchFilter = vm.watchFilterText$();
		var lastWatchUpdateTime = vm.lastWatchUpdateTime$();
		var shouldUpdate = (false
			|| this.lastKnownWatchUpdateTime != lastWatchUpdateTime
			|| this.lastKnownWatchFilter != lastWatchFilter
		);
		this.lastKnownWatchUpdateTime = lastWatchUpdateTime;
		this.lastKnownWatchFilter = lastWatchFilter;
		return shouldUpdate;
	}
}).from(a =>
	<tools-pane-watches block id={a.id} is-active-pane={a.activePane$()==a.id}>
		<Input class="watch-filter-textbox" value$={vm.watchFilterText$} onkeyup={e=>{if(e.keyCode==27){vm.watchFilterText$('')}}} type="text" required placeholder="🔎" title="Filter the watch list" />
		<ul class="watch-list">
			<li>
				<input type="checkbox" checked disabled title="Uncheck to delete this watch" />
				<input type="text" placeholder="/* add new watch here */" onchange={e=>{if(e.target.value) { vm.addPinnedWatch(e.target.value); e.target.value=''; e.target.focus(); }}} />
				<output></output>
			</li>
		{tm.watches.map((expr,i,a) => 
			<li>
				<input type="checkbox" checked title="Uncheck to delete this watch" onchange={e=>{if(!e.target.checked) { vm.removePinnedWatch(expr); e.target.checked=true; }}} />
				<Input type="text" title={expr} value$={m.prop2(x => expr, v => { if(a[i] != v) { a[i]=v; requestAnimationFrame(then=>vm.refreshWatches()); } })} />
				<output assert={vm.watchExpectedValues[expr] ? eval(vm.watchExpectedValues[expr])===vm.watchValues[expr] ? 'pass':'fail':'none'}>{`${vm.watchDisplayValues[expr]||''}`}</output>
				<button class="edit" title="Edit the expected value" onclick={e=>vm.setupExpectedValueFor(expr)}>edit</button>
			</li>
		)}
		</ul>
		<ul class="watch-list">{vm.autoWatches.map(expr => 
			<li hidden={vm.hiddenAutoWatches[expr]||!vm.watchFilter$().matches(expr)}>
				<input type="checkbox" title="Check to pin this watch" onchange={e=>{if(e.target.checked) { vm.addPinnedWatch(expr); e.target.checked=false; }}} />
				<input type="text" readonly title={expr} value={expr} />
				<output>{`${vm.watchDisplayValues[expr]||''}`}</output>
			</li>
		)}</ul>
	</tools-pane-watches>
)

interface ToolsPaneConsoleState { history: string[], historyIndex: number }
var ToolsPaneConsole = new Tag <{ id:string, activePane$:Prop<string> }, ToolsPaneConsoleState> ().with({
	oncreate(this: ToolsPaneConsoleState) {
		this.history = [''];
		this.historyIndex = 0;
	},
	onsumbit(this: ToolsPaneConsoleState, e: UIEvent) {
		try {
			var inp = (e.target as HTMLElement).querySelector('input'); 
			var expr = inp.value; inp.value = '';
			// update the expression history
			this.history[this.history.length-1] = expr;
			this.historyIndex = this.history.push("")-1;
			// append expression to console
			appendToConsole(">", new String(expr));
			// evaluate expression
			var res = undefined; try { 
				res = (getOutputPane().contentWindow as any).eval(expandShorthandsIn(expr)) 
			} catch (ex) {
				res = ex;
			}
			// append result to console
			appendToConsole("=", res);
		} catch (ex) {
			console.error(ex);
		} finally {
			e.preventDefault();
			return false;
		}
	},
	onkeypress(this: ToolsPaneConsoleState, e: KeyboardEvent) {
		var inp = (e.target as HTMLInputElement);
		if (e.key == 'Up' || e.key == 'ArrowUp') {
			if (this.historyIndex > 0) this.historyIndex--;
			inp.value = this.history[this.historyIndex];
		} else if (e.key == 'Down' || e.key == 'ArrowDown') {
			if (this.historyIndex < this.history.length-1) this.historyIndex++;
			inp.value = this.history[this.historyIndex];
		} else if (this.historyIndex == this.history.length-1) {
			this.history[this.historyIndex] = inp.value;
		} else {
			// nothing to do
		}
	}
}).from((a,c,self) =>
	<tools-pane-console id={a.id} is-active-pane={a.activePane$()==a.id}>
		<pre id={a.id+"Output"}></pre>
		<form method="POST" onsubmit={e=>self.onsumbit(e)}>
			<input type="text" onkeydown={e=>self.onkeypress(e)} oninput={e=>self.onkeypress(e)} />
		</form>
	</tools-pane-console>
)

var ToolsPaneCode = new Tag <{ id:string, activePane$:Prop<string>, value$:Prop<string> }> ().from(a =>
	<tools-pane-code id={a.id} is-active-pane={a.activePane$()==a.id}>
		<MonacoTextEditor id={a.id+'--editor'} value$={a.value$} language="javascript" />
	</tools-pane-code> // TODO
)

var OutputPaneCover = new Tag <{ id:string }> ().with({

	shouldBeHidden() {
		return !vm.isPicking$() && !vm.selectedElement$();
	},

	boxStyles$: cachedCast(vm.selectedElement$, elm => {
		var styles = {

			marginBox: {
				position: "absolute",
				transform: "translate(0, 0)",
				borderStyle: "solid",
				borderColor: "rgba(255,0,0,0.3)"
			} as any as CSSStyleDeclaration,

			borderBox: {
				borderStyle: "solid",
				borderColor: "rgba(0,0,0,0.3)"
			} as any as CSSStyleDeclaration,

			paddingBox: {
				borderStyle: "solid",
				borderColor: "rgba(0,0,0,0.4)", 
				backgroundColor: "rgba(0,0,0,0.5)", 
				backgroundClip: "padding-box"
			} as any as CSSStyleDeclaration,

			contentBox: {
				// nothing special
			} as any as CSSStyleDeclaration

		};
		if(elm) {
			var es = gCS(elm);
			
			// position
			styles.marginBox.display = 'block';
			styles.marginBox.top = `${gBCT(elm)}px`;
			styles.marginBox.left = `${gBCL(elm)}px`;
			
			// margin box
			var mt = parseInt(es.marginTop);
			var ml = parseInt(es.marginLeft);
			var mr = parseInt(es.marginRight);
			var mb = parseInt(es.marginBottom);
			styles.marginBox.transform = `translate(${-ml}px,${-mt}px)`;
			styles.marginBox.borderTopWidth = `${mt}px`;
			styles.marginBox.borderLeftWidth = `${ml}px`;
			styles.marginBox.borderRightWidth = `${mr}px`;
			styles.marginBox.borderBottomWidth = `${mb}px`;
			
			// border box
			var bt = parseInt(es.borderTopWidth);
			var bl = parseInt(es.borderLeftWidth);
			var br = parseInt(es.borderRightWidth);
			var bb = parseInt(es.borderBottomWidth);
			styles.borderBox.borderTopWidth = `${bt}px`;
			styles.borderBox.borderLeftWidth = `${bl}px`;
			styles.borderBox.borderRightWidth = `${br}px`;
			styles.borderBox.borderBottomWidth = `${bb}px`;
			
			// padding box
			var pt = parseInt(es.paddingTop);
			var pl = parseInt(es.paddingLeft);
			var pr = parseInt(es.paddingRight);
			var pb = parseInt(es.paddingBottom);
			styles.paddingBox.borderTopWidth = `${pt}px`;
			styles.paddingBox.borderLeftWidth = `${pl}px`;
			styles.paddingBox.borderRightWidth = `${pr}px`;
			styles.paddingBox.borderBottomWidth = `${pb}px`;
			
			// content box
			styles.contentBox.width = `${gBCW(elm)-pl-pr-bl-br}px`;
			styles.contentBox.height = `${gBCH(elm)-pt-pb-bt-bb}px`;
		}
		return styles;
	}),

	setCurrentElementFromClick(e: PointerEvent) {

		// ie hack to hide the element that covers the iframe and prevents elementFromPoint to work
		if("ActiveXObject" in window) {
			document.getElementById("outputPaneCover").style.display = 'none';
		}

		var elm = getOutputPane().contentDocument.elementFromPoint(e.offsetX, e.offsetY) || getOutputPane().contentDocument.documentElement;
		var shouldUpdate = vm.selectedElement$() !== elm;
		vm.selectedElement$(elm);

		// ie hack to unhide the element that covers the iframe and prevents elementFromPoint to work
		if("ActiveXObject" in window) {
			document.getElementById("outputPaneCover").style.display = '';
		}
		
		if(e.type == 'pointerdown' || e.type == 'mousedown') {

			// stop picking on pointer down
			vm.isPicking$(false);

			// also, update the watches for this new element
			vm.refreshWatches(elm);
			if(elm.sourceLine) {
				vm.shouldMoveToSelectedElement$(true);
			}
			
			// we should always update in this case
			shouldUpdate = true;

		}

		// we kinda need a synchronous redraw to be reactive
		// and we need no redraw at all if we didn't update
		(e as any).redraw = false;
		if(shouldUpdate) {
			m.redraw(true); 
		}

	},

	getPointerOrMouseEvents() {
		var onpointerdown = 'onpointerdown' in window ? 'onpointerdown' : 'onmousedown';
		var onpointermove = 'onpointermove' in window ? 'onpointermove' : 'onmousemove';
		if(this.shouldBeHidden()) {
			return {
				[onpointermove]: null, 
				[onpointerdown]: null
			};
		}
		if(!this.events) {
			this.events = { 
				[onpointermove]: e=>this.setCurrentElementFromClick(e), 
				[onpointerdown]: e=>this.setCurrentElementFromClick(e)
			}
		}
		return this.events;
	}

}).from((a,c,self)=>
	<output-pane-cover block id={a.id} is-active={vm.isPicking$()} {...self.getPointerOrMouseEvents()}>
		<margin-box block hidden={self.shouldBeHidden()} style={self.boxStyles$().marginBox}>
			<border-box block style={self.boxStyles$().borderBox}>
				<padding-box block style={self.boxStyles$().paddingBox}>
					<content-box block style={self.boxStyles$().contentBox}>
					</content-box>
				</padding-box>
			</border-box>
		</margin-box>
	</output-pane-cover>
)

var HTMLPane = new Tag<{ isFocused$: Prop<boolean> }>().from(a =>
	<html-pane is-focused={a.isFocused$()} disabled-style={{'flex-grow':tm.html?3:1}}><MonacoTextEditor id="htmlPaneEditor" value$={tm.html$} language="html" isFocused$={a.isFocused$} /></html-pane>
)

var CSSPane = new Tag<{ isFocused$: Prop<boolean> }>().from(a =>
	<css-pane is-focused={a.isFocused$()} disabled-style={{'flex-grow':tm.css?3:1}}><MonacoTextEditor id="cssPaneEditor" value$={tm.css$} language="css" isFocused$={a.isFocused$} /></css-pane>
);

var JSPane = new Tag<{ isFocused$: Prop<boolean> }>().from(a =>
	<js-pane is-focused={a.isFocused$()} disabled-style={{'flex-grow':tm.jsBody?3:1}}><MonacoTextEditor id="jsPaneEditor" value$={vm.jsCombined$} language="javascript" isFocused$={a.isFocused$} /></js-pane>
);

var ToolsPane = new Tag().from(a =>
	<tools-pane>
		<ToolsPaneToolbar activePane$={vm.activeJsTab$} />
		<tools-pane-tabs>
			<ToolsPaneWatches id="jsPaneWatches" activePane$={vm.activeJsTab$} />
			<ToolsPaneConsole id="jsPaneConsole" activePane$={vm.activeJsTab$} />
			<ToolsPaneCode id="jsPaneHeadCode" value$={tm.jsHead$} activePane$={vm.activeJsTab$} />
			<ToolsPaneCode id="jsPaneBodyCode" value$={tm.jsBody$} activePane$={vm.activeJsTab$} />
		</tools-pane-tabs>
	</tools-pane>
);

var OutputPane = new Tag().from(a =>
	<output-pane>
		<iframe id="outputPane" src="about:blank" border="0" frameborder="0" is-active={!vm.isPicking$()}></iframe>
		<OutputPaneCover id="outputPaneCover" />
		<output-pane-toolbar role="toolbar">
			<button onclick={e=>vm.isPicking$(!vm.isPicking$())}>⊳</button>
			<button onclick={e=>vm.refreshWatches()}>↻</button>
		</output-pane-toolbar>
	</output-pane>
);

var SelectorGenerationDialog = new Tag().with({
	generateReplacement() {
		var form = vm.selectorGenerationDialog;
		var w1 = window as any;
		// create the requested replacement, if possible
		switch(form.chosenMode$()) {
			case "auto": {
				w1.$0replacement = w1.$0.sourceTagId;
				break;
			}
			case "id": {
				if(form.chosenId$()) {
					// assign the id to the element if we can
					if(w1.$0) {
						w1.$0.id = form.chosenId$();
					}
					if(w1.$0 && w1.$0.sourceLine >= 1) {
						var txt = '^(.|\r)*?';
						var line = vm.lineMapping[w1.$0.sourceLine-1];
						for(var i = line; i--;) {
							txt += '\\n(.|\r)*?';
						}
						txt += '\\<' + w1.$0.tagName + '\\b';
						var reg = new RegExp(txt, 'i');
						tm.html = tm.html.replace(reg, '$& id="'+form.chosenId$()+'"');
						vm.run();
						if(!window['$0']) window['$0'] = { id: form.chosenId$() };
					}
					// then return the value
					w1.$0replacement = `$(${JSON.stringify('#'+form.chosenId$())})`;
				}
				break;
			}
			case "selector": {
				if(form.chosenSelector$()) {
					w1.$0replacement = `$(${JSON.stringify(form.chosenSelector$())})`;
				}
				break;
			}
		}

		form.isOpened$(false);
		
		if(form.watchValue$().defined) {
			vm.addPinnedWatch(form.watchExpression$(),form.watchValue$().value);
		} else {
			vm.addPinnedWatch(form.watchExpression$());			
		}
	}
}).from((a,s,self) => 
	<dialog as="selector-generation-dialog" autofocus hidden={!vm.selectorGenerationDialog.isOpened$()}>

		<section tabindex="-1">
			<h1>How do you want to do this?</h1>
			<form action="POST" onsubmit={e => { e.preventDefault(); self.generateReplacement(); }}>
				<label hidden={!vm.selectorGenerationDialog.isAutoAvailable$()} style="display: block; margin-bottom: 10px">
					<InputRadio name="chosenMode" value="auto" checkedValue$={vm.selectorGenerationDialog.chosenMode$} />
					Use the source index
				</label>
				<label style="display: block; margin-bottom: 10px">
					<InputRadio name="chosenMode" value="id" checkedValue$={vm.selectorGenerationDialog.chosenMode$} />
					Assign an id the the element
					<Input type="text" value$={vm.selectorGenerationDialog.chosenId$} onfocus={e=>vm.selectorGenerationDialog.chosenMode$('id')} />
				</label>
				<label style="display: block; margin-bottom: 10px">
					<InputRadio name="chosenMode" value="selector" checkedValue$={vm.selectorGenerationDialog.chosenMode$} />
					Use a css selector
					<Input type="text" value$={vm.selectorGenerationDialog.chosenSelector$} onfocus={e=>vm.selectorGenerationDialog.chosenMode$('selector')} />
				</label>
				<footer style="margin-top: 20px">
					<input type="submit" value="OK" />
					&nbsp;
					<input type="button" value="Cancel" onclick={e=>vm.selectorGenerationDialog.isOpened$(false)} />
				</footer>
			</form>
		</section>

	</dialog>
)

var SettingsDialog = new Tag().with({
	close() {
		var form = vm.settingsDialog;
		form.isOpened$(false);
	}
}).from((a,s,self) => 
	<dialog as="settings-dialog" autofocus hidden={!vm.settingsDialog.isOpened$()}>

		<section tabindex="-1">
			<h1>Settings</h1>
			<form action="POST" onsubmit={e => { e.preventDefault(); self.close(); }}>
				<label style="display: block; margin-bottom: 10px">
					<button onclick={e => vm.settingsDialog.openWelcomeDialog()}>
						<span class="icon">🛈</span>
						Open the welcome screen
					</button>
				</label>
				<label style="display: block; margin-bottom: 10px">
					<button onclick={e => vm.settingsDialog.openSearchDialog()}>
						<span class="icon">🔎</span>
						Search existing test cases
					</button>
				</label>			
				<hr />
				<label style="display: block; margin-bottom: 10px">
					<button hidden={vm.githubIsConnected$()} onclick={e => vm.settingsDialog.logIn()}>
						<span class="icon">🔒</span>
						Log In using your Github account
					</button>
					<button hidden={!vm.githubIsConnected$()} onclick={e => vm.settingsDialog.logOut()}>
						<span class="icon">🔒</span>
						Log Out of your Github account ({vm.githubUserName$()})
					</button>
				</label>
				<label style="display: block; margin-bottom: 10px">
					<button hidden={!vm.settingsDialog.useMonaco$()} onclick={e => vm.settingsDialog.useMonaco$(false)} style="display: block">
						<span class="icon">⚙</span>
						Disable the advanced text editor on this device from now on
					</button>
					<button hidden={vm.settingsDialog.useMonaco$()} onclick={e => vm.settingsDialog.useMonaco$(true)} style="display: block">
						<span class="icon">⚙</span>
						Enable the advanced text editor on this device from now on
					</button>
				</label>
				<footer style="margin-top: 20px">
					<input type="submit" value="Close" />
				</footer>
			</form>
		</section>

	</dialog>
)

var SearchDialog = new Tag().with({
	search() {
		var form = vm.searchDialog;
		form.searchUrl$('/search?q=' + encodeURIComponent(form.searchTerms$()) + '&time=' + Date.now());
	},
	close() {
		var form = vm.searchDialog;
		form.isOpened$(false);
	},
	onupdate() {
		var form = vm.searchDialog;
		if(this.wasOpened != form.isOpened$()) {
			if(this.wasOpened) {
				// TODO: close
			} else {
				// TODO: open
			}
		}
	}
}).from((a,s,self) => 
	<dialog as="search-dialog" autofocus hidden={!vm.searchDialog.isOpened$()}>

		<section tabindex="-1" role="search" style="width: 80%; width: 80vw">
			<h1>Search testcases</h1>
			<form action="POST" onsubmit={e => { e.preventDefault(); self.search(); }}>
				<p style="font-size: 10px">
					Search terms are separated by spaces, and must all match for the result to be returned; 
					You can use the --html --css --js --author modifiers to narrow down the search.
					Out of these, only --author considers its arguments as alternatives.
				</p>
				<p style="font-size: 10px; color: green;">
					Example: "table --css border hidden --author FremyCompany gregwhitworth" will return 
						all test cases containing "table" in any code field, 
						containing both border &amp; hidden in their css code,
						and that have been written by FremyCompany or gregwhitworth.
				</p>
				<div style="display: flex;">
					<Input placeholder="search terms here" value$={vm.searchDialog.searchTerms$} style="flex: 1 0 0px" />
					<input type="submit" value="Search" />
				</div>
				<iframe frameborder="0" border="0" src={vm.searchDialog.searchUrl$()}></iframe>
				<footer style="margin-top: 5px">
					<input type="button" onclick={e=>self.close()} value="Close" />
				</footer>
			</form>
		</section>

	</dialog>
)

var WelcomeDialog = new Tag().with({
	close() {
		var form = vm.welcomeDialog;
		localStorage.setItem('noWelcome','true');
		form.isOpened$(false);
	}
}).from((a,s,self) => 
	<dialog as="welcome-dialog" autofocus hidden={!vm.welcomeDialog.isOpened$()}>

		<section tabindex="-1">
			<h1>The Web Platform Test Center</h1>
			<form action="POST" onsubmit={e => { e.preventDefault(); self.close(); }}>
				<p>This websites provides tools to simplify the creation of reduced web platform test cases and the search of previously-written test cases.</p>
				<p>It is primarily addressed at engineers who build web browsers, and web developers who want to help bugs getting fixed by filing reduced issues on existing browsers.</p>
				<footer style="margin-top: 20px">
					<input type="submit" value=" Got it! " />
				</footer>
			</form>
		</section>

	</dialog>
)

var TestEditorView = new Tag <{id:string}> ().from(a => {
	// if the page moved to a new id 
	// then we need to reset all data and download the new test
	if(a.id != vm.currentTestId$() && (a.id == location.hash.substr(2) || (a.id.substr(0, 5) == 'json:' && location.hash.substr(0,7) == '#/json:'))) {
		vm.currentTestId$(a.id); vm.closeAllDialogs();
		var id = a.id; 
		if(id == 'local:save') {
			id = sessionStorage.getItem(id) || (localStorage.getItem('local:save') ? 'local:save' : 'new');
			vm.currentTestId$(id);
			vm.updateURL();
		}
		if(id.indexOf('local:') == 0) {

			try {
				vm.openFromJSON(JSON.parse(localStorage.getItem(id)));
			} catch(ex) {
				alert("An error occurred while trying to load that test. Is it still in your local storage?");
			}

			// when we recover the local:save test, we should offer to save online
			if(a.id=='local:save') {
				sessionStorage.removeItem('local:save');
				localStorage.removeItem('local:save');
				if(id!='local:save' && vm.githubIsConnected$()) {
					setTimeout(function() {
						if(confirm(`Welcome back, ${vm.githubUserName$()}! Should we save your test online now?`)) {
							localStorage.removeItem(id);
							vm.saveOnline(); 
						}
					}, 32);
				}
			}

		} else if(id.indexOf('json:') == 0) {

			vm.openFromJSON(JSON.parse(decodeHash(location.hash.substr('#/json:'.length))));

		} else if(id && id != 'new') {

			vm.isLoading$(true);
			vm.openFromJSON(null);
			fetch('/uploads/' + id + '.json').then(r => r.json()).then(d => {
				vm.openFromJSON(d);
			});

		}
	}
	// in all cases, we return the same markup though to avoid trashing
	return (
		<body>

			<BodyToolbar model={tm} />
			<top-row row>
				<HTMLPane isFocused$={vm.isHtmlPaneFocused$} />
				<CSSPane isFocused$={vm.isCssPaneFocused$} />
				<JSPane isFocused$={vm.isJsPaneFocused$} />
			</top-row>

			<bottom-row row>
				<OutputPane />
				<ToolsPane />
			</bottom-row>

			<SelectorGenerationDialog />
			<SettingsDialog />
			<SearchDialog />
			<WelcomeDialog />

		</body>
	).children;
})

m.route(document.body, '/new', { '/:id...': TestEditorView() })

//----------------------------------------------------------------
setInterval(updatePageTitle, 3000);
function updatePageTitle() {
	var titlePart = '';
	var urlPart = '';
	var id = vm.currentTestId$();
	if(id && id != 'new' && id.substr(0,5) != 'json:') {
		urlPart = 'wptest.center/#/' + id;
	} else {
		urlPart = 'wptest.center';
	}
	if(tm.title && tm.title != 'UntitledTest') {
		titlePart = tm.title + ' - ';
	}
	document.title = titlePart + urlPart;
}
