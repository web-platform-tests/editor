// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

///
/// This file contains mithril extensions to build my own framework
///
/// <reference path="monaco.d.ts" />
/// <reference path="editor-helpers.tsx" />

declare var m: M.Static;
declare var cssbeautify: (cssText: string, opts?:any) => string;

declare namespace JSX {
	interface ElementClass extends M.Component<any,M.Lifecycle<any,any>> {}
	interface ElementAttributesProperty { attributes }
	interface IntrinsicElements { 
		input: IntrinsicInputElement
		[elemName: string]: IntrinsicElement
	}
	interface IntrinsicElement { 

		id             ?: string
		class          ?: string
		style          ?: string | {}
		onclick        ?: Function | string
		onmouseup      ?: Function | string
		onmousedown    ?: Function | string
		onpointereup   ?: Function | string
		onpointerdown  ?: Function | string
		onkeydown      ?: Function | string
		onkeyup        ?: Function | string
		onkeypress     ?: Function | string
		onfocus        ?: Function | string
		onblur         ?: Function | string

		[attrName: string]: any

	}
	interface IntrinsicInputElement extends IntrinsicElement {

		type        ?: string

		value       ?: string | number
		checked     ?: string | boolean
		readonly    ?: string | boolean

		min         ?: string | number
		max         ?: string | number
		step        ?: string | number

		oninput		?: Function | string
		onchange    ?: Function | string

	}
}

declare var React : { 

	createElement(
		obj : string, 
		attributes : any, 
		...children : Array<M.Child>
	): M.VirtualNode<any,any>

	createElement<T extends M.Component<any,any>>(
		obj : () => T, 
		attributes : any, 
		...children : Array<M.Child>
	): T

};

interface Prop<T> {
	(): T
	(v:T): T
}

declare namespace M {
	interface Static {
		prop: <T>(initialValue:T) => Prop<T>
		prop2: <T>(get:(v?:any)=>T,set:(v:T)=>any) => Prop<T>
		addProps: <I,O extends I>(i:I) => O
	}
}

declare var require: { (modulePaths:string[], callback:Function):void };

m.route.prefix('#');

var amountOfRedrawSuspenders = 0;
function suspendRedrawsOn(codeToRun: (redraw: Function) => any) {

	// add one more suspender to the list
	amountOfRedrawSuspenders += 1;

	// remove the suspender on completion
	new Promise(codeToRun).then(redrawIfReady, redrawIfReady)
	function redrawIfReady() {
		if(--amountOfRedrawSuspenders == 0) {

			// actually redraw if all suspenders are cleared
			m.redraw();

		}
	}
}

function redrawIfReady() {
	if(amountOfRedrawSuspenders == 0) {
		m.redraw();
	}
}

m.prop = function(cv) {
	return function(nv) {
		if(arguments.length >= 1) {
			if(cv !== nv) {
				cv = nv; 
				redrawIfReady();
			}
		} else {
			return cv;
		}
	}
} as any

m.prop2 = function(get, set) {
	return function(nv) {
		if(arguments.length >= 1) {
			set(nv);
		} else {
			return get(nv);
		}
	}
} as any

m.addProps = function(o) {
	var r = Object.create(o);
	for(let key in o) {
		if(Object.prototype.hasOwnProperty.call(o,key)) {
			Object.defineProperty(r, key, { get() { return o[key] }, set(v) { o[key]=v; redrawIfReady(); }})
			r[key+'$'] = function(v) {
				if(arguments.length == 0) {
					return o[key];
				} else {
					o[key] = v;
				}
			}
		}
	}
	r.sourceModel = o;
	return r;
} as any

React = {
	createElement(t,a,...children) {
		return typeof(t) == 'string' ? m(t,a,children) : m(t(),a,children);
	}
} as any;

type JSXTag<Attributes, State, Prototype> = M.Component<Attributes, M.Lifecycle<Attributes, State>> & { attributes?:Attributes; state: State } & Prototype;
type JSXTagView<Attributes, State, Prototype> = (attributes: Attributes, children: M.ChildArray, self: Prototype & State) => M.VirtualNode;
class Tag<Attributes,State={},Prototype={}>{
	prototype: Prototype = Object.prototype as any
	with<NewPrototype extends Prototype>(prototype: NewPrototype): Tag<Attributes, State, NewPrototype & Prototype> {
		this.prototype = prototype;
		return this as any;
	}
	from(view: JSXTagView<Attributes, State, Prototype>): () => JSXTag<Attributes, State, Prototype> {
		var jsTagImplementation = { 
			__proto__: this.prototype, 
			state: Object.create(null), 
			view(n:M.VirtualNode) { 
				var output = view(n.attrs as any, n.children, this as any); 
				if(output instanceof Array) { 
					// no single wrapper --> no attribute generation
					var outputName = n.attrs['of'] || 'body';
					iterateChildrenArray(output);
				} else if(output.tag) {
					var outputName = output.attrs ? (output.attrs['as'] || output.tag) : output.tag;
					output.children && iterateChildrenArray(output.children);
					if(n.attrs && n.attrs['of']) {
						output.attrs || (output.attrs = Object.create(null));
						output.attrs['of'] = n.attrs['of'];
					}
				}
				return output;
				//-------------------------------------------------------------
				function iterateChildrenArray(nodes: M.ChildArray) {
					for(var child of nodes) {
						if(child instanceof Array) {
							iterateChildrenArray(child);
						} else if(typeof(child) == 'object') {
							(child as any).attrs = (child as any).attrs || {};
							if(!(child as any).attrs['of']) {
								(child as any).attrs['of'] = outputName;
							}
							if((child as any).children) {
								iterateChildrenArray((child as any).children)
							}
						} else {
							// text nodes do not need an attribute
						}
					}
				}
			}
		} as any;
		return () => jsTagImplementation;
	}
}

function cachedCast<I,O>(input$: ()=>I, convertInput: (i:I)=>O) {
	var currentInp = undefined;
	var currentOut = undefined;
	return function(): O {
		var inp = input$();
		if(inp !== currentInp) {
			currentInp = inp;
			currentOut = convertInput(inp);
		}
		return currentOut;
	}
}

function cachedDualCast<I,O>(input$: Prop<I>, convertInput: (i:I)=>O, convertOutput: (o:O)=>I):Prop<O> {
	var currentInp = undefined;
	var currentOut = undefined;
	return function(v:O) {
		if(arguments.length >= 1) {
			if(currentOut !== v) {
				input$(convertOutput(v))
				return v;
			}
		} else {
			var inp = input$();
			if(inp !== currentInp) {
				currentOut = convertInput(inp);
			}
			return currentOut;
		}
	} as any
}

function bindTo(x: Prop<string|boolean|number>, attr:string="value") {
	return m.withAttr(attr, x);
}

function attributesOf(a) {
	var o = Object.create(null);
	for(var key of Object.getOwnPropertyNames(a)) {
		if(key[key.length-1] != '$') {
			o[key] = a[key];
		}
	}
	return o;
}