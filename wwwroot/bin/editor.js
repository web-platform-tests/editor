var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
/// <reference path="mithril.d.ts" />
var d = document;
var w = window;
var $ = document.querySelector.bind(document);
var $$ = document.querySelectorAll.bind(document);
var eFP = document.elementFromPoint.bind(document);
var gCS = window.getComputedStyle.bind(window);
var gBCW = function (elm) { return elm.getBoundingClientRect().width; };
var gBCH = function (elm) { return elm.getBoundingClientRect().height; };
var gBCT = function (elm) { return elm.getBoundingClientRect().top; };
var gBCL = function (elm) { return elm.getBoundingClientRect().left; };
var gBCB = function (elm) { return elm.getBoundingClientRect().bottom; };
var gBCR = function (elm) { return elm.getBoundingClientRect().right; };
var rAF = window.requestAnimationFrame.bind(window);
var describe = function (elm) {
    return elm.nodeName + (elm.id ? "#" + elm.id : '') + (elm.classList.length ? "." + elm.classList[0] : '');
};
var convertObjectToDescription = function (arg) {
    if (arg === null)
        return "null";
    if (arg === undefined)
        return "undefined";
    if (arg instanceof String)
        return arg; // only string objects can get through
    if (typeof arg == "number") { // we allow more than what json recognizes
        if (Number.isNaN(arg))
            return "Number.NaN";
        if (!Number.isFinite(arg) && arg >= 0)
            return "Number.POSITIVE_INFINITY";
        if (!Number.isFinite(arg) && arg <= 0)
            return "Number.NEGATIVE_INFINITY";
        return JSON.stringify(arg);
    }
    if (typeof arg == 'function') {
        try {
            return "" + arg;
        }
        catch (ex) { }
        return '[object Function]';
    }
    var tag = '', str = '', jsn = '';
    try {
        tag = Object.prototype.toString.call(arg);
    }
    catch (ex) { }
    ;
    try {
        str = "" + arg;
    }
    catch (ex) { }
    try {
        jsn = JSON.stringify(arg);
    }
    catch (ex) { }
    if (str == tag) {
        str = '';
    }
    if (tag == '[object Object]')
        tag = '';
    if (arg.cloneNode && 'outerHTML' in arg) {
        try {
            return arg.cloneNode(false).outerHTML + ' ' + jsn;
        }
        catch (ex) { }
    }
    if (tag && (typeof (arg) == 'object' || typeof (arg) == 'symbol')) {
        try {
            return [tag, str, jsn].filter(function (x) { return x; }).join(' ');
        }
        catch (ex) { }
    }
    if (jsn)
        return jsn;
    if (str)
        return str;
    if (tag)
        return tag;
    return "[object]";
};
var buildSelectorFor = function (elm) {
    var isValidPair = function (selector, elm) {
        var matches = elm.ownerDocument.querySelectorAll(selector);
        return (matches.length == 1) && (matches[0] === elm);
    };
    var isValid = function (selector) {
        return isValidPair(selector, elm);
    };
    var getPossibleAttributesFor = function (elm) { return getIdsOf(elm).map(function (a) { return [
        { selector: "#" + escapeIdentForCSS(a), slot: 'id' }
    ]; }).concat([
        // tagname
        [
            { selector: getTagNameOf(elm), slot: 'tag' }
        ]
    ], getClassesOf(elm).map(function (c) { return [
        { selector: "." + escapeIdentForCSS(c), slot: 'class' }
    ]; }), getAttributesOf(elm).map(function (a) { return [
        elm.id ? { selector: "#" + escapeIdentForCSS(a), slot: 'id' } : { selector: getTagNameOf(elm), slot: 'tag' },
        { selector: "[" + a + "]", slot: 'class' } // atributes should never be non-css, and some have att=value
    ]; }), [
        // tagname ... :nth-of-type(<int>)
        [
            { selector: getTagNameOf(elm), slot: 'tag' },
            { selector: ":nth-of-type(" + getNthTypeOf(elm) + ")", slot: 'pseudo' }
        ],
    ]); };
    var buildSelectorFrom = function (input) {
        var tag = '';
        var ids = '';
        var cls = '';
        var pse = '';
        for (var _i = 0, input_1 = input; _i < input_1.length; _i++) {
            var ss = input_1[_i];
            for (var _a = 0, ss_1 = ss; _a < ss_1.length; _a++) {
                var s = ss_1[_a];
                switch (s.slot) {
                    case 'tag': {
                        tag = tag || s.selector;
                        break;
                    }
                    case 'id': {
                        ids = ids || s.selector;
                        break;
                    }
                    case 'class': {
                        cls += s.selector;
                        break;
                    }
                    case 'pseudo': {
                        pse += s.selector;
                        break;
                    }
                }
            }
        }
        return tag + ids + cls + pse;
    };
    var escapeIdentForCSS = function (item) { return ((item.split('')).map(function (character) {
        if (character === ':') {
            return "\\" + (':'.charCodeAt(0).toString(16).toUpperCase()) + " ";
        }
        else if (/[ !"#$%&'()*+,.\/;<=>?@\[\\\]^`{|}~]/.test(character)) {
            return "\\" + character;
        }
        else {
            return encodeURIComponent(character).replace(/\%/g, '\\');
        }
    }).join('')); };
    var getTagNameOf = function (elm) { return escapeIdentForCSS(elm.tagName.toLowerCase()); };
    var getNthTypeOf = function (elm) {
        var index = 0, cur = elm;
        do {
            if (cur.tagName == elm.tagName) {
                index++;
            }
        } while (cur = cur.previousElementSibling);
        return index;
    };
    var getIdsOf = function (elm) {
        return elm.id ? [elm.id] : [];
    };
    var getClassesOf = function (elm) {
        var result = [];
        for (var i = 0; i < elm.classList.length; i++) {
            result.push(elm.classList[i]);
        }
        return result;
    };
    var getAttributesOf = function (elm) {
        var result = [];
        for (var i = 0; i < elm.attributes.length; i++) {
            switch (elm.attributes[i].name.toLowerCase()) {
                case "id":
                case "class":
                case "style": break;
                case "name": if (/^[_-a-z0-9]+$/i.test(elm.getAttribute('name'))) {
                    result.push('name="' + elm.getAttribute('name') + '"');
                    break;
                }
                case "type": if (elm instanceof HTMLInputElement) {
                    result.push('type=' + elm.type);
                    break;
                }
                default: result.push(elm.attributes[i].name);
            }
        }
        return result;
    };
    var buildLocalSelectorFor = function (elm, prelude) {
        // let's try to build a selector using the element only
        var options = getPossibleAttributesFor(elm);
        if (isValid(prelude + buildSelectorFrom(options))) {
            // let's remove stuff from the end until we can't
            var cur_opts = options.slice(0);
            var sav_opts = options.slice(options.length);
            while (cur_opts.length > 1 || (cur_opts.length > 0 && sav_opts.length > 0)) {
                var dropped_option = cur_opts.pop();
                var new_opts = sav_opts.length ? cur_opts.concat(sav_opts) : cur_opts;
                if (!isValid(prelude + buildSelectorFrom(new_opts))) {
                    sav_opts.unshift(dropped_option);
                }
            }
            // build the minimal selector
            var new_opts = sav_opts.length ? cur_opts.concat(sav_opts) : cur_opts;
            var elementSelector = buildSelectorFrom(new_opts);
            // if we could not remove :nth-of-type and have no prelude, we might want to add a prelude about the parent
            var parent_1 = elm.parentElement;
            if (!prelude && ~elementSelector.indexOf(':nth-of-type')) {
                if (parent_1) {
                    // this will help disambiguate things a bit
                    if (parent_1.id) {
                        prelude = "#" + escapeIdentForCSS(parent_1.id) + " > ";
                    }
                    else if (~(['HTML', 'BODY', 'HEAD', 'MAIN'].indexOf(parent_1.tagName))) {
                        prelude = escapeIdentForCSS(getTagNameOf(parent_1)) + " > ";
                    }
                    else if (parent_1.classList.length) {
                        prelude = escapeIdentForCSS(getTagNameOf(parent_1)) + "." + escapeIdentForCSS(parent_1.classList[0]) + " > ";
                    }
                    else {
                        prelude = escapeIdentForCSS(getTagNameOf(parent_1)) + " > ";
                    }
                    // maybe we can even remove the nth-of-type now?
                    var simplifiedElementSelector = elementSelector.replace(/:nth-of-type\(.*?\)/, '');
                    if (isValid(prelude + simplifiedElementSelector)) {
                        elementSelector = simplifiedElementSelector;
                    }
                }
            }
            return prelude + elementSelector;
        }
        else if (prelude) {
            // the given prelude is not valid
            return null;
        }
        else {
            // let's see if we can just reply :root
            if (!elm.parentElement) {
                return ':root';
            }
            // let's try to find an id parent which can narrow down to one element only
            var generalPrelude = '';
            var cur = elm.parentElement;
            while (cur = cur.parentElement) {
                if (cur.id) {
                    var r = buildLocalSelectorFor(elm, "#" + escapeIdentForCSS(cur.id) + " ");
                    if (r)
                        return r;
                    break;
                }
            }
            // let's try again but this time using a class
            cur = elm.parentElement;
            while (cur = cur.parentElement) {
                if (cur.classList.length) {
                    for (var ci = 0; ci < cur.classList.length; ci++) {
                        var r = buildLocalSelectorFor(elm, "." + escapeIdentForCSS(cur.classList[ci]) + " ");
                        if (r)
                            return r;
                    }
                }
            }
            // let's just append this selector to a unique selector to its parent
            //TODO: actually, we should filter based on whether we find the element uniquely instead, not its parent
            var parentSelector = buildSelectorFor(elm.parentElement);
            return buildLocalSelectorFor(elm, parentSelector + " > ");
        }
    };
    return buildLocalSelectorFor(elm, '');
};
function encodeHash(text) {
    return text.replace(/\u200B/g, "\u200B\u200B").replace(/#/g, "\u200Bⵌ").replace(/%/g, "\u200B℅").replace(/\r/g, "\u200Br").replace(/\n/g, "\u200Bn").replace(/\t/g, "\u200Bt");
}
function decodeHash(text) {
    return text.replace(/(?:%[a-f0-9]+)+/gim, function (t) { try {
        return decodeURIComponent(t);
    }
    catch (ex) {
        return t;
    } }).replace(/\u200Bt/g, "\t").replace(/\u200Bn/g, "\n").replace(/\u200Br/g, "\r").replace(/\u200B℅/g, "%").replace(/\u200Bⵌ/g, "#").replace(/\u200B\u200B/g, "\u200B");
}
/* fix for pad */
if (window.external && ('DoEvents' in window.external)) {
    history.replaceState = function () { };
    history.pushState = function () { };
}
/* fix for ie */
if (!Array.from) {
    Array.from = function from(src, mapFn) {
        var array = new Array(src.length);
        for (var i = 0; i < src.length; i++) {
            array[i] = mapFn ? mapFn(src[i]) : src[i];
        }
        return array;
    };
}
if (!Object.assign) {
    Object.assign = function assign(target, source) {
        for (var key in source) {
            target[key] = source[key];
        }
    };
}
if (!String.raw) {
    String.raw = function (callSite) {
        var substitutions = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            substitutions[_i - 1] = arguments[_i];
        }
        var template = Array.from(callSite.raw);
        return template.map(function (chunk, i) {
            if (callSite.raw.length <= i) {
                return chunk;
            }
            return substitutions[i - 1] ? substitutions[i - 1] + chunk : chunk;
        }).join('');
    };
}
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
/// <reference path="monaco.d.ts" />
/// <reference path="editor-helpers.tsx" />
m.route.prefix('#');
var amountOfRedrawSuspenders = 0;
function suspendRedrawsOn(codeToRun) {
    // add one more suspender to the list
    amountOfRedrawSuspenders += 1;
    // remove the suspender on completion
    new Promise(codeToRun).then(redrawIfReady, redrawIfReady);
    function redrawIfReady() {
        if (--amountOfRedrawSuspenders == 0) {
            // actually redraw if all suspenders are cleared
            m.redraw();
        }
    }
}
function redrawIfReady() {
    if (amountOfRedrawSuspenders == 0) {
        m.redraw();
    }
}
m.prop = function (cv) {
    return function (nv) {
        if (arguments.length >= 1) {
            if (cv !== nv) {
                cv = nv;
                redrawIfReady();
            }
        }
        else {
            return cv;
        }
    };
};
m.prop2 = function (get, set) {
    return function (nv) {
        if (arguments.length >= 1) {
            set(nv);
        }
        else {
            return get(nv);
        }
    };
};
m.addProps = function (o) {
    var r = Object.create(o);
    var _loop_1 = function (key) {
        if (Object.prototype.hasOwnProperty.call(o, key)) {
            Object.defineProperty(r, key, { get: function () { return o[key]; }, set: function (v) { o[key] = v; redrawIfReady(); } });
            r[key + '$'] = function (v) {
                if (arguments.length == 0) {
                    return o[key];
                }
                else {
                    o[key] = v;
                }
            };
        }
    };
    for (var key in o) {
        _loop_1(key);
    }
    r.sourceModel = o;
    return r;
};
React = {
    createElement: function (t, a) {
        var children = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            children[_i - 2] = arguments[_i];
        }
        return typeof (t) == 'string' ? m(t, a, children) : m(t(), a, children);
    }
};
var Tag = /** @class */ (function () {
    function Tag() {
        this.prototype = Object.prototype;
    }
    Tag.prototype.with = function (prototype) {
        this.prototype = prototype;
        return this;
    };
    Tag.prototype.from = function (view) {
        var jsTagImplementation = {
            __proto__: this.prototype,
            state: Object.create(null),
            view: function (n) {
                var output = view(n.attrs, n.children, this);
                if (output instanceof Array) {
                    // no single wrapper --> no attribute generation
                    var outputName = n.attrs['of'] || 'body';
                    iterateChildrenArray(output);
                }
                else if (output.tag) {
                    var outputName = output.attrs ? (output.attrs['as'] || output.tag) : output.tag;
                    output.children && iterateChildrenArray(output.children);
                    if (n.attrs && n.attrs['of']) {
                        output.attrs || (output.attrs = Object.create(null));
                        output.attrs['of'] = n.attrs['of'];
                    }
                }
                return output;
                //-------------------------------------------------------------
                function iterateChildrenArray(nodes) {
                    for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                        var child = nodes_1[_i];
                        if (child instanceof Array) {
                            iterateChildrenArray(child);
                        }
                        else if (typeof (child) == 'object') {
                            child.attrs = child.attrs || {};
                            if (!child.attrs['of']) {
                                child.attrs['of'] = outputName;
                            }
                            if (child.children) {
                                iterateChildrenArray(child.children);
                            }
                        }
                        else {
                            // text nodes do not need an attribute
                        }
                    }
                }
            }
        };
        return function () { return jsTagImplementation; };
    };
    return Tag;
}());
function cachedCast(input$, convertInput) {
    var currentInp = undefined;
    var currentOut = undefined;
    return function () {
        var inp = input$();
        if (inp !== currentInp) {
            currentInp = inp;
            currentOut = convertInput(inp);
        }
        return currentOut;
    };
}
function cachedDualCast(input$, convertInput, convertOutput) {
    var currentInp = undefined;
    var currentOut = undefined;
    return function (v) {
        if (arguments.length >= 1) {
            if (currentOut !== v) {
                input$(convertOutput(v));
                return v;
            }
        }
        else {
            var inp = input$();
            if (inp !== currentInp) {
                currentOut = convertInput(inp);
            }
            return currentOut;
        }
    };
}
function bindTo(x, attr) {
    if (attr === void 0) { attr = "value"; }
    return m.withAttr(attr, x);
}
function attributesOf(a) {
    var o = Object.create(null);
    for (var _i = 0, _a = Object.getOwnPropertyNames(a); _i < _a.length; _i++) {
        var key = _a[_i];
        if (key[key.length - 1] != '$') {
            o[key] = a[key];
        }
    }
    return o;
}
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
///
/// This file contains the view model of the application
///
/// <reference path="lib/editor-framework.tsx" />
/// <reference path="lib/model.d.ts" />
/** The iframe in which vm.run() writes */
var getOutputPane = function () {
    var outputPane = document.getElementById('outputPane');
    if (outputPane) {
        getOutputPane = function () { return outputPane; };
    }
    return outputPane;
};
/** The document representation of the output pane */
var getOutputPaneElement = function () {
    if (!getOutputPane()) {
        var parser = new DOMParser();
        var doc = parser.parseFromString('', 'text/html');
        return doc.documentElement;
    }
    return getOutputPane().contentDocument.documentElement;
};
/** Helper to handle autofocus of dialogs */
function handleAutofocus(shouldGetFocus$, element) {
    if (shouldGetFocus$()) {
        var focusElement = (element.querySelector('[autofocus]')
            || element.querySelector('input,button,select,textarea,[tabindex]'));
        if (!focusElement)
            return;
        setTimeout(function (time) { return focusElement.focus(); }, 16);
        setTimeout(function (time) { return focusElement instanceof HTMLInputElement && focusElement.select(); }, 16);
        shouldGetFocus$(false);
    }
}
function appendToConsole(logo, content) {
    var jsPaneConsoleOutput = window.jsPaneConsoleOutput;
    if (jsPaneConsoleOutput) {
        var textContent = convertObjectToDescription(content);
        var logoSpan = document.createElement("span");
        {
            logoSpan.textContent = logo + " ";
        }
        var contentSpan = document.createElement("span");
        {
            contentSpan.textContent = textContent;
        }
        var entry = document.createElement("div");
        {
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
function expandShorthandsIn(jsCode) {
    var describeCode = "(node => node.nodeName + (node.id ? '#' + node.id : '') + (node.classList.length ? '.' + node.classList[0] : ''))(";
    if ("ActiveXObject" in window) { /* ie hack */
        describeCode = "(function(node){ return node.nodeName + (node.id ? '#' + node.id : '') + (node.classList.length ? '.' + node.classList[0] : '') })(";
    }
    return (jsCode
        .replace(/^\$\$\(/g, 'document.querySelectorAll(')
        .replace(/^\$\(/g, 'document.querySelector(')
        .replace(/\b\$\$\(/g, 'document.querySelectorAll(')
        .replace(/\b\$\(/g, 'document.querySelector(')
        .replace(/(\;|\,|\(|\)|\+|\-|\*|\/|\=|\<|\>|\||\&|\\|\s)\$\$\(/g, '$1document.querySelectorAll(')
        .replace(/(\;|\,|\(|\)|\+|\-|\*|\/|\=|\<|\>|\||\&|\\|\s)\$\(/g, '$1document.querySelector(')
        .replace(/^eFP\(/g, 'document.elementFromPoint(')
        .replace(/^eFP\b/g, 'document.elementFromPoint.bind(document)')
        .replace(/\beFP\(/g, 'document.elementFromPoint(')
        .replace(/\beFP\b/g, 'document.elementFromPoint.bind(document)')
        .replace(/^gCS\(/g, 'getComputedStyle(')
        .replace(/^gCS\b/g, 'getComputedStyle.bind(window)')
        .replace(/^rAF\(/g, 'requestAnimationFrame(')
        .replace(/^rAF\b/g, 'requestAnimationFrame.bind(window)')
        .replace(/\bgCS\(/g, 'getComputedStyle(')
        .replace(/\bgCS\b/g, 'getComputedStyle.bind(window)')
        .replace(/\brAF\(/g, 'requestAnimationFrame(')
        .replace(/\brAF\b/g, 'requestAnimationFrame.bind(window)')
        .replace(/\.gBCW\(\)/g, '.getBoundingClientRect().width')
        .replace(/\.gBCH\(\)/g, '.getBoundingClientRect().height')
        .replace(/\.gBCL\(\)/g, '.getBoundingClientRect().left')
        .replace(/\.gBCT\(\)/g, '.getBoundingClientRect().top')
        .replace(/\.gBCR\(\)/g, '.getBoundingClientRect().right')
        .replace(/\.gBCB\(\)/g, '.getBoundingClientRect().bottom')
        .replace(/^describe\(/g, describeCode)
        .replace(/\bdescribe\(/g, describeCode));
}
/** The data of the test being written (as ViewModel) */
var tm = m.addProps({
    title: "UntitledTest",
    html: "",
    css: "",
    jsBody: "",
    jsHead: "",
    watches: [],
    watchValues: [],
    fileName: "testcase",
    filePath: ""
});
/** The data of the test being written (as JSON) */
var getTestData = function () {
    // get the data
    var tmData = tm.sourceModel;
    // sync the watchValues before returning the data
    tmData.watchValues = tmData.watches.map(function (expr) { return vm.watchExpectedValues[expr]; });
    // return the data
    return tmData;
};
/** Script test constants */
var SCRIPT_TESTS = Object.freeze({
    STATUS: Object.freeze({
        PASS: 0,
        FAIL: 1,
        TIMEOUT: 2,
        NOTRUN: 3
    }),
    PHASE: Object.freeze({
        INITIAL: 0,
        STARTED: 1,
        HAS_RESULT: 2,
        COMPLETE: 3
    })
});
/** The data used to represent the current state of the view */
var ViewModel = /** @class */ (function () {
    function ViewModel() {
        // ===================================================
        // github state (readonly)
        // ===================================================
        var _this = this;
        this.githubUserData$ = cachedCast(function () { return document.cookie; }, function (cookie) {
            // read data from the user cookie (and trust it)
            var userCookie = decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent('user').replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || 'null';
            // parse that data into an object
            var user = null;
            try {
                user = JSON.parse(userCookie.substr(2, userCookie.length - 46));
            }
            catch (ex) { }
            ;
            // return the result
            return user;
        });
        this.githubIsConnected$ = cachedCast(this.githubUserData$, function (user) { return !!user; });
        this.githubUserName$ = cachedCast(this.githubUserData$, function (user) { return user ? user.username : "anonymous"; });
        this.githubUserId$ = cachedCast(this.githubUserData$, function (user) { return user ? user.id : null; });
        this.githubUserEmail$ = cachedCast(this.githubUserData$, function (user) { return user ? user.email : null; });
        // ===================================================
        // editor settings
        // ===================================================
        /** The id of the currently edited test */
        this.currentTestId$ = m.prop("new");
        /** The combined jsHead and jsBody */
        this.jsCombined$ = function (v) {
            if (arguments.length == 0) {
                var jsHead = tm.jsHead;
                var jsBody = tm.jsBody;
                if (jsHead) {
                    jsBody = '//<head>\r\n' + jsHead + '\r\n//</head>\r\n' + jsBody;
                }
                return jsBody;
            }
            else {
                var jsHead = '';
                var jsBody = v;
                jsBody = jsBody.replace(/^\/\/<head>\r\n((.|\r|\n)*)\r\n\/\/<\/head>\r\n/, function (m, code) {
                    jsHead = code;
                    return '';
                });
                tm.jsHead = jsHead;
                tm.jsBody = jsBody;
            }
        };
        this.isHtmlPaneFocused$ = m.prop(false);
        this.isCssPaneFocused$ = m.prop(false);
        this.isJsPaneFocused$ = m.prop(false);
        // ===================================================
        // jsPane settings
        // ===================================================
        /** The id of the currently active tab */
        this.activeJsTab$ = m.prop('jsPaneWatches');
        // ===================================================
        // dom viewer settings
        // ===================================================
        /** The last time the DOM Viewer Tree was updated */
        this.lastDOMUpdateTime$ = m.prop(-1);
        /** The HTML text being displayed in the tree of the DOM Viewer */
        this.domViewerHTMLText$ = m.prop("");
        // ===================================================
        // watch settings
        // ===================================================
        /** This value should be updated each time the watches are modified, and trigger their UI update */
        this.lastWatchUpdateTime$ = m.prop(-1);
        /** The readonly watches for the selected element */
        this.autoWatches = [
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
        ].concat((function (e) {
            var ds = Array.from(getComputedStyle(document.documentElement)).sort();
            return ds.map(function (prop) { return "gCS($0)['" + prop + "']"; });
        })());
        /** Cache of the script test results */
        this.scriptTestResults$ = m.prop([]);
        /** Determines whether the script test results should be visible */
        this.isScriptTestsVisible$ = m.prop(true);
        /** Metadata of all script test results */
        this.numberOfScriptTests$ = cachedCast(function () { return _this.scriptTestResults$(); }, function (tests) { return tests.length; });
        this.numberOfSuccessfulScriptTests$ = cachedCast(function () { return _this.scriptTestResults$(); }, function (tests) {
            return tests.reduce(function (c, t) { return (c + (t.status === SCRIPT_TESTS.STATUS.PASS ? 1 : 0)); }, 0);
        });
        this.numberOfFailedScriptTests$ = cachedCast(function () { return _this.scriptTestResults$(); }, function (tests) {
            return tests.reduce(function (c, t) { return (c + (t.status === SCRIPT_TESTS.STATUS.PASS ? 0 : 1)); }, 0);
        });
        /** Cache of the values of the watches (as js object) */
        this.watchValues = Object.create(null);
        /** Cache of the values of the watches (as string) */
        this.watchDisplayValues = Object.create(null);
        /** Cache of the expected values of the watches (as js expressions) */
        this.watchExpectedValues = Object.create(null);
        /** Special flag map of watches to hide (because they have been pinned) */
        this.hiddenAutoWatches = Object.create(null);
        /** The text currently used as display-filter input for the watches */
        this.watchFilterText$ = m.prop("");
        /** The actual test used as display-filter for the watches (readonly) */
        this.watchFilter$ = cachedCast(function () { return _this.watchFilterText$(); }, function (filterText) {
            // if no text in the search box, every watch matches
            var isTextMatching = function (expr) { return true; };
            // convert the text into a matcher
            if (filterText.length > 0) {
                // normal case = indexOf search
                var filterTextLC = filterText.toLowerCase();
                isTextMatching = function (expr) { return !!~expr.toLowerCase().indexOf(filterTextLC); };
                // special case if regexp is typed
                if (filterText.indexOf('/') == 0) {
                    var reg = null;
                    try {
                        reg = reg || eval(filterText);
                    }
                    catch (ex) { }
                    try {
                        reg = reg || eval(filterText + '/i');
                    }
                    catch (ex) { }
                    if (reg instanceof RegExp) {
                        isTextMatching = function (expr) { return reg.test(expr); };
                    }
                }
            }
            // return the matcher
            return { matches: isTextMatching };
        });
        // ===================================================
        // watch replacement dialog
        // ===================================================
        this.welcomeDialog = new WelcomeDialogViewModel(this);
        // ===================================================
        // watch replacement dialog
        // ===================================================
        this.searchDialog = new SearchDialogViewModel(this);
        // ===================================================
        // watch replacement dialog
        // ===================================================
        this.selectorGenerationDialog = new SelectorGenerationDialogViewModel(this);
        // ===================================================
        // settings dialog
        // ===================================================
        this.settingsDialog = new SettingsDialogViewModel(this);
        // ===================================================
        // deleted user dialog
        // ===================================================
        this.deletedUserDialog = new DeletedUserDialogViewModel(this);
        // ===================================================
        // user testcases dialog
        // ===================================================
        this.userTestcasesDialog = new UserTestcasesDialogViewModel(this);
        // ===================================================
        // export testcases dialog
        // ===================================================
        this.exportDialog = new ExportDialogViewModel(this);
        // ===================================================
        // output frame settings
        // ===================================================
        /** Whether the mouse is being tracked to select a new element */
        this.isPicking$ = m.prop(false);
        /** The currently to-be-selected element under the mouse */
        this.selectedElement$ = m.prop(null);
        /** Whether a line jump is advised in the html editor */
        this.shouldMoveToSelectedElement$ = m.prop(false);
        /** The mapping between current source lines and source lines at the time of the last run */
        this.lineMapping = [0];
        /** How many source lines the current run had */
        this.lineMappingLineCount = 1;
        /** Cache of the auto-generated IDs, for cleaning purpose */
        this.idMappings = new Set();
        /** Whether the test model is still waiting on some data from the server */
        this.isLoading$ = m.prop(false);
    }
    /** Update sate management of the DOM Viewer tree */
    ViewModel.prototype.refreshDOMViewer = function () {
        this.domViewerHTMLText$(getOutputPaneElement().outerHTML);
        this.lastDOMUpdateTime$(performance.now());
    };
    ViewModel.prototype.setChangeInScriptTestVisibility = function (visible) {
        this.isScriptTestsVisible$(visible);
        this.lastWatchUpdateTime$(performance.now());
    };
    ViewModel.prototype.setupExpectedValueFor = function (expr) {
        // get the current expected value if any
        var currentExpectedValue = this.watchExpectedValues[expr];
        // get the current watch value if any
        var currentWatchValue = '';
        try {
            currentWatchValue = JSON.stringify(this.watchValues[expr]);
        }
        catch (ex) { }
        // now prompt for a new expected value
        var newValue = prompt("Please enter a javascript expression producing the expected value (leave empty to set none)", currentExpectedValue || currentWatchValue || '');
        // parse it into a form we can safely consider an expected value
        try {
            switch (newValue) {
                case null:
                case '':
                case 'true':
                case 'false':
                case 'null':
                case 'undefined':
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
                        if (typeof (newValue) == 'string' || typeof (newValue) == 'number' || typeof (newValue) == 'boolean') {
                            newValue = JSON.stringify(newValue);
                        }
                        else {
                            throw new Error("Unsupported value; only primitive types are supported");
                        }
                    }
            }
        }
        catch (ex) {
            alert('Sorry, this value cannot be used as an expected value.\n\nOnly primitive types are supported.');
            console.error(ex);
            return;
        }
        // set this as the new expected value
        if (newValue) {
            this.watchExpectedValues[expr] = newValue;
        }
        else if (newValue === '') {
            delete this.watchExpectedValues[expr];
        }
        else {
            return; // because the user cancelled
        }
        // invalidate the current rendering (if necessary)
        vm.lastWatchUpdateTime$(performance.now());
        m.redraw();
    };
    /** Fetches the testcases for the given user and  */
    ViewModel.prototype.fetchTestcasesByUser = function (author) {
        var _this = this;
        fetch("/u/" + author, {
            method: 'GET',
            credentials: "same-origin"
        }).then(function (response) {
            response.text().then(function (text) {
                _this.userTestcasesDialog.tests$(JSON.parse(text));
            });
        }).catch(function (ex) {
            console.error(ex);
            console.log("Oops, something went wrong... Can't seem to get the tests created by " + author + ".");
        });
    };
    /** Deletes the test by the gievn id and author */
    ViewModel.prototype.deleteTestcase = function (author, id) {
        var _this = this;
        fetch("/delete/t/" + id + "/" + author, {
            method: 'DELETE',
            credentials: "same-origin"
        }).then(function (response) {
            response.text().then(function (text) {
                alert(text);
                _this.fetchTestcasesByUser(author);
            });
        }).catch(function (ex) {
            console.error(ex);
            alert("Oops, something went wrong... Try deleting the test again.");
        });
    };
    /** Adds an expression to the list of watches (eventually bootstrapped with a value) */
    ViewModel.prototype.addPinnedWatch = function (expr, value) {
        // check that we have a base on which pinning this expression makes sense
        var processedExpression = expr;
        if (~expr.indexOf("$0")) {
            var w1 = window;
            if (!w1.$0) {
                // cannot pin an auto watch when no element is on the stack
                return;
            }
            else if (w1.$0replacement || w1.$0.id) {
                // we already know how to replace $0 by a stable expression
                processedExpression = processedExpression.replace(/\$0/g, w1.$0replacement || w1.$0.id);
            }
            else {
                // we need to show the dialog before replacing $0 by $0replacement
                var dialog = this.selectorGenerationDialog;
                dialog.watchExpression$(expr);
                dialog.watchValue$({ defined: arguments.length >= 2, value: value });
                dialog.autoId$(w1.$0.sourceTagId || '');
                dialog.chosenMode$(w1.$0.sourceTagId ? 'id' : 'selector');
                dialog.chosenId$(w1.$0.sourceTagId || '');
                dialog.chosenSelector$(buildSelectorFor(w1.$0));
                dialog.open();
                return;
            }
        }
        // if we were given a fake element as $0, we need to delete it before running the watches
        if (w1 && w1.$0 && 'id' in w1.$0 && !('nodeName' in w1.$0))
            window['$0'] = undefined;
        // actually pin this expresion now that the safety checks have run
        tm.watches.push(processedExpression);
        if (arguments.length >= 2) {
            // a value was provided for us, let's use it
            vm.watchValues[processedExpression] = value;
            vm.watchDisplayValues[processedExpression] = "" + value; // TODO
        }
        else if (expr in vm.watchValues) {
            // we just pinned some auto watch
            vm.watchValues[processedExpression] = vm.watchValues[expr];
            vm.watchDisplayValues[processedExpression] = vm.watchDisplayValues[expr];
            vm.hiddenAutoWatches[expr] = true;
        }
        else {
            // we have no recollection of this watch, recompute everything
            vm.refreshWatches();
        }
        this.lastWatchUpdateTime$(performance.now());
    };
    /** Removes an expression from the list of watches */
    ViewModel.prototype.removePinnedWatch = function (expr) {
        var index = tm.watches.indexOf(expr);
        if (index >= 0) {
            tm.watches.splice(index, 1);
        }
        this.lastWatchUpdateTime$(performance.now());
    };
    /** Recomputes the values and display values of watches */
    ViewModel.prototype.refreshWatches = function (elm) {
        // possibly push elm on the stack of selected elements
        if (elm) {
            var w1 = window;
            var w2 = getOutputPane().contentWindow;
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
        this.watchValues = Object.create(null);
        this.watchDisplayValues = Object.create(null);
        this.hiddenAutoWatches = Object.create(null);
        // evalute the watches
        var w1 = window;
        var w2 = getOutputPane().contentWindow;
        for (var _i = 0, _a = tm.watches.concat(vm.autoWatches); _i < _a.length; _i++) {
            var expr = _a[_i];
            var result = '';
            if (expr && (w1.$0 || !~expr.indexOf("$0"))) {
                try {
                    result = w2.eval(expandShorthandsIn(expr));
                }
                catch (ex) {
                    result = '!!!' + (ex.message ? ex.message : "" + ex);
                }
            }
            // output the current value
            vm.watchValues[expr] = result;
            vm.watchDisplayValues[expr] = "" + result; // TODO
        }
        this.lastWatchUpdateTime$(performance.now());
    };
    // ===================================================
    // general dialog settings
    // ===================================================
    ViewModel.prototype.isAnyDialogOpen$ = function () {
        for (var key in this) {
            var this_key = this[key];
            if (this_key instanceof DialogViewModel) {
                if (this_key.isOpened$()) {
                    return true;
                }
            }
        }
        return false;
    };
    ViewModel.prototype.closeAllDialogs = function () {
        for (var key in this) {
            var this_key = this[key];
            if (this_key instanceof DialogViewModel) {
                this_key.close();
            }
        }
    };
    /** Removes the user cookie */
    ViewModel.prototype.logOut = function () {
        document.cookie = 'user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        redrawIfReady();
    };
    /** Redirects to the login page */
    ViewModel.prototype.logIn = function () {
        var currentId = this.currentTestId$();
        if (currentId != 'local:save' && currentId != 'new') {
            sessionStorage.setItem('local:save', currentId);
        }
        location.href = '/login/github/start';
    };
    /** Deletes the user from the app and logs them out */
    ViewModel.prototype.deleteUser = function () {
        var _this = this;
        fetch('/delete/u', {
            method: 'DELETE',
            credentials: "same-origin"
        }).then(function (response) {
            response.text().then(function (text) {
                _this.deletedUserDialog.deletedUser$(_this.githubUserName$());
                _this.deletedUserDialog.newAnonymousUser$(text);
                _this.logOut();
            });
        }).catch(function (ex) {
            console.error(ex);
            alert("Oops, something went wrong... Try deleting your account again.");
        });
    };
    /** Refreshes the output frame with the latest source code */
    ViewModel.prototype.run = function () {
        var _this = this;
        // hide outdated element outline
        this.isPicking$(false);
        this.selectedElement$(null);
        if (window.jsPaneConsoleOutput) {
            window.jsPaneConsoleOutput.innerHTML = '';
        }
        // bail out if we don't have loaded yet
        var outputPane = getOutputPane();
        if (!outputPane) {
            setTimeout(function (x) { return _this.run(); }, 100);
            return;
        }
        // remove any $ values since we are going to clear the inner document
        var w1 = window;
        var w2 = outputPane.contentWindow;
        var recoverableElements = [];
        w1.$0replacement = undefined;
        for (var i = 10; i--;) {
            recoverableElements.unshift(w1['$' + i]);
            w1['$' + i] = w2['$' + i] = undefined;
        }
        this.idMappings.forEach(function (id) {
            w2[id] = undefined;
        });
        this.idMappings.clear();
        // extract the doctype, if any (default to html5 doctype)
        var doctype = "<!doctype html>";
        var html = tm.html.replace(/<!doctype .*?>/gi, function (value) {
            doctype = value;
            return '';
        });
        // generate new document
        var d = outputPane.contentWindow.document;
        d.open();
        d.write(doctype);
        // prepare the console hooks
        outputPane.contentWindow.console.debug = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            args.forEach(function (arg) { return appendToConsole('-', arg); });
            console.debug.apply(console, args);
        };
        outputPane.contentWindow.console.log = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            args.forEach(function (arg) { return appendToConsole('-', arg); });
            console.log.apply(console, args);
        };
        outputPane.contentWindow.console.dir = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            args.forEach(function (arg) { return appendToConsole('-', arg); });
            console.dir.apply(console, args);
        };
        outputPane.contentWindow.console.info = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            args.forEach(function (arg) { return appendToConsole('i', arg); });
            console.info.apply(console, args);
        };
        outputPane.contentWindow.console.warn = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            args.forEach(function (arg) { return appendToConsole('!', arg); });
            console.warn.apply(console, args);
        };
        outputPane.contentWindow.console.error = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            args.forEach(function (arg) { return appendToConsole('‼️', arg); });
            console.error.apply(console, args);
        };
        // write the document content
        d.write("<title>" + tm.title.replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</title>");
        d.write("<script>" + tm.jsHead + '<' + '/script> <script src="bin/testharness.js"><' + '/script>');
        d.write("<style>" + tm.css + "</style>");
        attributeLines(0);
        var htmlLines = html.split("\n");
        for (var lineIndex = 0; lineIndex < htmlLines.length;) {
            d.writeln(htmlLines[lineIndex]);
            attributeLines(++lineIndex);
        }
        d.write("<script>" + tm.jsBody + "<" + "/script>");
        d.close();
        // reset the line mapping
        vm.lineMapping = htmlLines.map(function (l, i) { return i; });
        vm.lineMappingLineCount = htmlLines.length;
        // create short names for all elements without custom id
        attributeIds(this);
        // recover $0/1/... values if we can
        for (var i = 10; i--;) {
            var elm = recoverableElements[i];
            if (elm) {
                try {
                    if (elm.id) {
                        w1['$' + i] = w2['$' + i] = w2.document.getElementById(elm.id);
                    }
                    else if (elm.sourceLine) {
                        // TODO: try to match elements by sourceLine and tagName
                    }
                }
                catch (ex) {
                    w1['$' + i] = w2['$' + i] = null;
                }
            }
        }
        // rerun the watches and refresh DOM viewer
        this.refreshWatches();
        this.refreshDOMViewer();
        //-------------------------------------------------------
        /** Detects newly inserted elements and note which html line generated them */
        function attributeLines(lineIndex) {
            for (var i = d.all.length; i--;) {
                if (d.all[i].sourceLine == undefined) {
                    d.all[i].sourceLine = lineIndex;
                }
                else {
                    break;
                }
            }
        }
        /** Creates global variables to easily access nodes without id */
        function attributeIds(vm) {
            var tagCounters = Object.create(null);
            for (var i = 0; ++i < d.all.length;) {
                var el = d.all[i];
                if (el.sourceLine > 0 && el != d.body) {
                    var tagCounter = tagCounters[el.tagName] = 1 + (tagCounters[el.tagName] | 0);
                    if (!el.id) {
                        var tagId = el.tagName.toLowerCase() + tagCounter;
                        if (!getOutputPane().contentWindow[tagId]) {
                            getOutputPane().contentWindow[tagId] = el;
                            el.sourceTagId = tagId;
                            vm.idMappings.add(tagId);
                            console.log(tagId, el);
                        }
                    }
                }
            }
        }
    };
    /** Saves the test in a json url */
    ViewModel.prototype.saveInUrl = function () {
        suspendRedrawsOn(function (redraw) {
            location.hash = "#/json:" + encodeHash(JSON.stringify(getTestData()));
            vm.currentTestId$(location.hash.substr(2));
            redraw();
            // pad has no easy-to-use address bar, so provide an easy source to copy the url:
            if (window.external && "DoEvents" in window.external) {
                prompt("Copy the url from here:", location.href);
            }
        });
    };
    /** Saves the test model in the localStorage */
    ViewModel.prototype.saveLocally = function () {
        var _this = this;
        var data = getTestData();
        var id = '';
        var idLetters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        for (var i = 5; i--;) {
            id += idLetters[Math.floor(Math.random() * idLetters.length)];
        }
        sessionStorage.setItem('local:save', 'local:' + id);
        localStorage.setItem('local:' + id, JSON.stringify(data));
        localStorage.setItem('local:save', localStorage.getItem('local:' + id)); // in case the session gets lost
        suspendRedrawsOn(function (redraw) {
            _this.currentTestId$("local:" + id);
            location.hash = "#/local:" + id;
            redraw();
        });
    };
    /** Saves the test model on the server */
    ViewModel.prototype.saveOnline = function () {
        var _this = this;
        // ensure test case title:
        if (!tm.title || tm.title == "UntitledTest") {
            try {
                tm.title = prompt("Enter a title for your test (pressing cancel will abort save)", tm.title);
                if (tm.title == null) {
                    tm.title = "UntitledTest";
                    return;
                }
            }
            catch (ex) {
                // do nothing
            }
        }
        // ensure the user is connected
        if (!this.githubIsConnected$()) {
            this.saveLocally();
            alert("You are about to be redirected to the login page. Your current work has been saved locally with id " + sessionStorage.getItem('local:save') + ", and will be recovered after you log in.");
            this.settingsDialog.logIn();
            return;
        }
        // upload the testcase data
        var data = getTestData();
        fetch('/new/testcase/', {
            method: 'POST',
            body: JSON.stringify(data),
            credentials: "same-origin"
        }).then(function (r) { return r.json(); }).then(function (o) {
            sessionStorage.removeItem('local:save');
            localStorage.removeItem('local:save');
            suspendRedrawsOn(function (redraw) {
                // update the data
                _this.currentTestId$(o.id);
                _this.updateURLForTest();
                // refresh the iframe and view
                _this.run();
                // remove suspender
                redraw();
            });
        }).catch(function (ex) {
            console.error(ex);
            alert("Oops, something went wrong... Try again or save locally by pressing ALT when you click on the save button.");
        });
    };
    /** Redirects the page to have the specified user's testcases in an dialog open */
    ViewModel.prototype.redirectToUsersTests = function (author) {
        this.userTestcasesDialog.previousUrl$(location.hash);
        history.replaceState(getTestData(), "Tests by " + this.githubUserName$(), "/#/u/" + this.githubUserName$());
    };
    /** Closes the testcases dialog and redirects back to the previous page */
    ViewModel.prototype.redirectBackFromUsersTests = function () {
        history.replaceState(getTestData(), document.title, this.userTestcasesDialog.previousUrl$());
        updatePageTitle();
    };
    /** Resets the test model based on new data */
    ViewModel.prototype.openFromJSON = function (newData) {
        this.isLoading$(false);
        this.watchValues = Object.create(null);
        this.watchDisplayValues = Object.create(null);
        this.watchExpectedValues = Object.create(null);
        Object.assign(tm.sourceModel, {
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
        if (newData) {
            Object.assign(tm.sourceModel, newData);
            if (newData.watchValues && newData.watchValues.length) {
                for (var i = newData.watchValues.length; i--;) {
                    this.watchExpectedValues[newData.watches[i]] = newData.watchValues[i];
                }
            }
        }
        this.updateURLForTest();
        this.run();
    };
    /** Updates url and page title on test id change */
    ViewModel.prototype.updateURLForTest = function () {
        updatePageTitle();
        location.hash = '#/' + vm.currentTestId$();
        history.replaceState(getTestData(), document.title, location.href); // TODO: clone
    };
    /** Exports the test into a web platform test and return the file content as string */
    ViewModel.prototype.saveToFileString = function () {
        var html = '';
        function ln() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            html += (html ? '\n' : '') + String.raw.apply(String, args);
        }
        // extract the doctype, if any (default to html5 doctype)
        var doctype = "<!doctype html>";
        var tm_html = tm.html.replace(/<!doctype .*?>\s*\r?\n?/gi, function (value) {
            doctype = value.trim();
            return '';
        }).trim();
        // start the document
        ln(__makeTemplateObject(["", ""], ["", ""]), doctype);
        // ensure test case title:
        if (tm.title) {
            ln(__makeTemplateObject(["<title>", "</title>"], ["<title>", "</title>"]), tm.title.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
        }
        else {
            ln(__makeTemplateObject(["<title>UntitledTest</title>"], ["<title>UntitledTest</title>"]));
        }
        // ensure test case harness:
        var pathToHarness = "/resources/";
        ln(__makeTemplateObject(["<script src=\"", "testharness.js\"></script>"], ["<script src=\"", "testharness.js\"></script>"]), pathToHarness);
        ln(__makeTemplateObject(["<script src=\"", "testharnessreport.js\"></script>"], ["<script src=\"", "testharnessreport.js\"></script>"]), pathToHarness);
        // append the test case itself
        if (tm.jsHead) {
            ln(__makeTemplateObject(["<script>", "</script>"], ["<script>", "</script>"]), "\n\n" + tm.jsHead + "\n\n");
        }
        if (tm.css) {
            ln(__makeTemplateObject(["<style>", "</style>"], ["<style>", "</style>"]), "\n\n" + tm.css + "\n\n");
        }
        if (tm_html) {
            ln(__makeTemplateObject([""], [""]));
            ln(__makeTemplateObject(["", ""], ["", ""]), tm_html);
            ln(__makeTemplateObject([""], [""]));
        }
        if (tm.jsBody) {
            ln(__makeTemplateObject(["<script>", "</script>"], ["<script>", "</script>"]), "\n\n" + tm.jsBody + "\n\n");
        }
        if (Array.from(tm.watches).length > 0 || !tm.jsBody) {
            ln(__makeTemplateObject(["<script>\nvar test_description = document.title;\npromise_test(\n\tt => {\n\t\treturn new Promise(test => addEventListener('load', e=>test()))\n\t\t", "\n\t},\n\ttest_description\n);\n</script>"], ["<script>\nvar test_description = document.title;\npromise_test(\n\tt => {\n\t\treturn new Promise(test => addEventListener('load', e=>test()))\n\t\t",
                "\n\t},\n\ttest_description\n);\n</script>"]), Array.from(tm.watches).map(function (expr) { return ({
                expression: expr,
                jsValue: vm.watchValues[expr]
            }); }).filter(function (w) { return !!w.expression; }).map(function (w) {
                return ".then(test => assert_equals(" + expandShorthandsIn(w.expression) + ", " + JSON.stringify(w.jsValue) + ", " + JSON.stringify("Invalid " + w.expression + ";") + "))";
            }).join('\n\t\t'));
        }
        return html;
    };
    /** Exports the test into a web platform test and initiate a download */
    ViewModel.prototype.saveToFile = function () {
        var html = this.saveToFileString();
        var blob = new Blob([html], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        var fileName = (tm.fileName || "testcase");
        if (!/[.](html|htm|xht|xhtml)$/i.test(fileName)) {
            fileName += '.html';
        }
        a.setAttribute("download", fileName);
        a.href = url;
        a.click();
        setTimeout(function (x) { return URL.revokeObjectURL(url); }, 10000);
    };
    return ViewModel;
}());
var DialogViewModel = /** @class */ (function () {
    function DialogViewModel(vm) {
        /** The attached view model */
        this.vm = null;
        /** Whether the dialog is opened or closed */
        this.isOpened$ = m.prop(false);
        /** Whether the dialog should get focus */
        this.shouldGetFocus$ = m.prop(false);
        this.vm = vm;
    }
    /** Opens the dialog */
    DialogViewModel.prototype.open = function () {
        this.isOpened$(true);
        this.shouldGetFocus$(true);
    };
    /** Closes the dialog */
    DialogViewModel.prototype.close = function () {
        this.isOpened$(false);
        this.shouldGetFocus$(false);
    };
    return DialogViewModel;
}());
var SelectorGenerationDialogViewModel = /** @class */ (function (_super) {
    __extends(SelectorGenerationDialogViewModel, _super);
    function SelectorGenerationDialogViewModel() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /** The raw watch expression we want to pin */
        _this.watchExpression$ = m.prop("");
        /** Its precomputed value, in case one was given */
        _this.watchValue$ = m.prop({ defined: false, value: undefined });
        /** The id auto-generated for the element, if any */
        _this.autoId$ = m.prop("");
        /** Whether there is an auto-generated id (readonly) */
        _this.isAutoAvailable$ = cachedCast(_this.autoId$, function (x) { return !!x; });
        /** The mode chosen by the user */
        _this.chosenMode$ = m.prop("auto");
        /** The id the user typed in the text box (id mode) */
        _this.chosenId$ = m.prop("");
        /** The selector the user typed in the text box (selector mode) */
        _this.chosenSelector$ = m.prop("");
        return _this;
    }
    return SelectorGenerationDialogViewModel;
}(DialogViewModel));
var SettingsDialogViewModel = /** @class */ (function (_super) {
    __extends(SettingsDialogViewModel, _super);
    function SettingsDialogViewModel() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /** Whether the dialog is opened or closed */
        _this.isOpened$ = m.prop(false);
        /** Whether to use Monaco on this device or not */
        _this.useMonaco$ = m.prop2(function (v) {
            if (typeof (_this.intenal_useMonaco) == 'undefined') {
                _this.intenal_useMonaco = !localStorage.getItem('noMonaco');
            }
            return _this.intenal_useMonaco;
        }, function (v) {
            _this.intenal_useMonaco = !!v;
            localStorage.setItem('noMonaco', v ? '' : 'true');
        });
        return _this;
    }
    /** Ask the viewmodel to log the user out */
    SettingsDialogViewModel.prototype.logOut = function () {
        this.vm.logOut();
    };
    /** Ask the viewmodel to log a user in */
    SettingsDialogViewModel.prototype.logIn = function () {
        this.vm.logIn();
    };
    /** Ask the viewmodel to delete this user */
    SettingsDialogViewModel.prototype.deleteUser = function () {
        this.vm.deleteUser();
    };
    /** Open the welcome dialog */
    SettingsDialogViewModel.prototype.openWelcomeDialog = function () {
        this.vm.welcomeDialog.open();
    };
    /** Open the search dialog */
    SettingsDialogViewModel.prototype.openSearchDialog = function () {
        this.vm.searchDialog.open();
    };
    return SettingsDialogViewModel;
}(DialogViewModel));
var DeletedUserDialogViewModel = /** @class */ (function (_super) {
    __extends(DeletedUserDialogViewModel, _super);
    function DeletedUserDialogViewModel() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /** The user that ws deleted */
        _this.deletedUser$ = m.prop("");
        /** The username of the anonymous user name assigned to the tests from the deleted user */
        _this.newAnonymousUser$ = m.prop("");
        return _this;
    }
    return DeletedUserDialogViewModel;
}(DialogViewModel));
var UserTestcasesDialogViewModel = /** @class */ (function (_super) {
    __extends(UserTestcasesDialogViewModel, _super);
    function UserTestcasesDialogViewModel(vm) {
        var _this = _super.call(this, vm) || this;
        /** The author to display the tests of */
        _this.author$ = m.prop("");
        /** The tests created by this author */
        _this.tests$ = m.prop([]);
        /** The previous URL that was open to return to */
        _this.previousUrl$ = m.prop("");
        _this.author$(vm.githubUserName$());
        _this.previousUrl$("/#/new");
        return _this;
    }
    UserTestcasesDialogViewModel.prototype.updateAuthorOfTestcases = function (author) {
        this.author$(author);
        this.vm.fetchTestcasesByUser(author);
    };
    UserTestcasesDialogViewModel.prototype.deleteTest = function (id) {
        this.vm.deleteTestcase(this.author$(), id);
    };
    return UserTestcasesDialogViewModel;
}(DialogViewModel));
var WelcomeDialogViewModel = /** @class */ (function (_super) {
    __extends(WelcomeDialogViewModel, _super);
    function WelcomeDialogViewModel(vm) {
        var _this = _super.call(this, vm) || this;
        if (location.hash == '' || location.hash == '#/new') {
            if (!localStorage.getItem('noWelcome') && !vm.githubIsConnected$()) {
                _this.open();
            }
            else {
                localStorage.setItem('noWelcome', 'true');
            }
        }
        else {
            localStorage.setItem('noWelcome', 'true');
        }
        return _this;
    }
    return WelcomeDialogViewModel;
}(DialogViewModel));
var SearchDialogViewModel = /** @class */ (function (_super) {
    __extends(SearchDialogViewModel, _super);
    function SearchDialogViewModel() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /** The text that is being searched */
        _this.searchTerms$ = m.prop("");
        /** The text that is being searched */
        _this.searchUrl$ = m.prop("about:blank");
        return _this;
    }
    /** Opens the dialog */
    SearchDialogViewModel.prototype.open = function () {
        if (!this.isOpened$()) {
            this.searchTerms$("");
            this.searchUrl$("about:blank");
            this.isOpened$(true);
        }
        this.shouldGetFocus$(true);
    };
    return SearchDialogViewModel;
}(DialogViewModel));
var ExportDialogViewModel = /** @class */ (function (_super) {
    __extends(ExportDialogViewModel, _super);
    function ExportDialogViewModel() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /** The title of the test */
        _this.title$ = m.prop("UntitledTest");
        /** The file name of the test */
        _this.fileName$ = m.prop("testcase");
        /** The path to the spec's test folder */
        _this.filePath$ = m.prop("");
        return _this;
    }
    /** Opens the dialog */
    ExportDialogViewModel.prototype.open = function (tm) {
        if (!this.isOpened$()) {
            this.title$("UntitledTest");
            this.fileName$("testcase");
            this.filePath$("");
            this.isOpened$(true);
        }
        this.shouldGetFocus$(true);
        if (tm) {
            this.importValues(tm);
        }
    };
    /** Import the values from the global scope */
    ExportDialogViewModel.prototype.importValues = function (tm) {
        this.title$(tm.title$());
        this.fileName$(tm.fileName$());
        this.filePath$(tm.filePath$());
    };
    /* Export the values from the global scope */
    ExportDialogViewModel.prototype.exportValues = function (tm) {
        tm.title$(this.title$());
        tm.fileName$(this.fileName$());
        tm.filePath$(this.filePath$());
    };
    return ExportDialogViewModel;
}(DialogViewModel));
var vm = new ViewModel();
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
/// <reference path="editor-vm.tsx" />
var Input = new Tag().from(function (a) {
    return React.createElement("input", __assign({}, attributesOf(a), { value: a.value$(), oninput: bindTo(a.value$), onchange: bindTo(a.value$) }));
});
var InputCheckbox = new Tag().from(function (a) {
    return React.createElement("input", __assign({ type: "checkbox" }, attributesOf(a), { checked: a.value$(), onchange: bindTo(a.value$, "checked") }));
});
var InputRadio = new Tag().from(function (a) {
    return React.createElement("input", __assign({ type: "radio" }, attributesOf(a), { checked: a.checkedValue$() == a.value, onchange: bindTo(a.checkedValue$) }));
});
var TextArea = new Tag().from(function (a) {
    return React.createElement("textarea", __assign({}, attributesOf(a), { oninput: bindTo(a.value$), onchange: bindTo(a.value$) }), a.value$());
});
var BodyToolbar = new Tag().from(function (a) {
    return React.createElement("body-toolbar", { row: true, role: "toolbar" },
        React.createElement("button", { onclick: function (e) { return vm.run(); }, title: "Move your code to the iframe" }, "Run"),
        React.createElement("button", { onclick: function (e) { if (e.shiftKey) {
                vm.saveInUrl();
            }
            else if (e.altKey) {
                vm.saveLocally();
            }
            else {
                vm.saveOnline();
            } }, title: "Save your test online (Shift: url, Alt: local storage)" }, "Save"),
        React.createElement("button", { onclick: function (e) { return vm.exportDialog.open(tm); }, title: "Download or upload as a weplatform test case" }, "Export"),
        React.createElement("button", { onclick: function (e) { return vm.settingsDialog.open(); }, title: "Open the settings dialog" }, "\u22C5\u22C5\u22C5"),
        React.createElement("hr", { style: "visibility: hidden; flex:1 0 0px;" }),
        React.createElement(Input, { "value$": a.model.title$, title: "Title of your test case" }));
});
var MonacoTextEditor = new Tag().with({
    oncreate: function (node) {
        var _this = this;
        // set default state values
        this.editor = null;
        this.value = node.attrs.value$();
        this.isDirty = false;
        // wait for monaco to load if needed
        if (localStorage.getItem('noMonaco'))
            return;
        require(['vs/editor/editor.main'], function (then) {
            // create the text editor, and save it in the state
            _this.value = node.attrs.value$();
            _this.isDirty = false;
            var editor = _this.editor = monaco.editor.create(document.getElementById(node.attrs.id + 'Area'), {
                value: _this.value,
                fontSize: 13,
                lineNumbers: "off",
                lineNumbersMinChars: 0,
                folding: false,
                minimap: {
                    enabled: false
                },
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
            _this.editor.getModel().updateOptions({
                insertSpaces: false,
                tabSize: 4,
            });
            // register to some events to potentially update the linked value
            _this.editor.getModel().onDidChangeContent(function (e) {
                if (_this.editor.isFocused()) {
                    _this.isDirty = true;
                    redrawIfReady();
                }
            });
            _this.editor.onDidFocusEditor(function () {
                if (node.attrs && node.attrs.isFocused$) {
                    node.attrs.isFocused$(true);
                    redrawIfReady();
                }
            });
            _this.editor.onDidBlurEditor(function () {
                if (node.attrs && node.attrs.isFocused$) {
                    node.attrs.isFocused$(false);
                    redrawIfReady();
                }
            });
            // register to the window resize event, and relayout if needed
            window.addEventListener('resize', function (x) {
                _this.editor.layout();
            });
            // hookup language-specific things
            switch (node.attrs.language) {
                case "html": {
                    _this.editor.getModel().onDidChangeContent(function (e) {
                        var change = e.changes[0]; // there seems to be only one change at a given time for HTML panel editing
                        var oldLineCount = 1 + change.range.endLineNumber - change.range.startLineNumber;
                        var newLineCount = countLines(change.text);
                        var deltaLineCount = (newLineCount - oldLineCount);
                        var totalLineCount = countLines(editor.getValue());
                        var newLineMapping = new Array(totalLineCount);
                        for (var x = 0; x < totalLineCount; x++) {
                            if (x < change.range.startLineNumber) {
                                newLineMapping[x] = crossMappingHelper(x);
                            }
                            else if (x < change.range.startLineNumber + newLineCount - 1) {
                                newLineMapping[x] = crossMappingHelper(change.range.startLineNumber - 1);
                            }
                            else {
                                newLineMapping[x] = crossMappingHelper(x - deltaLineCount);
                            }
                        }
                        vm.lineMapping = newLineMapping;
                        function countLines(txt) {
                            return txt.split(/\n/g).length;
                        }
                        function crossMappingHelper(x) {
                            if (x < vm.lineMapping.length) {
                                return vm.lineMapping[x];
                            }
                            else {
                                return vm.lineMappingLineCount - 1;
                            }
                        }
                    });
                    _this.editor.addAction({
                        id: 'wpt-inspect',
                        label: 'Inspect this element',
                        contextMenuGroupId: 'navigation',
                        contextMenuOrder: 0,
                        run: function () {
                            var sourceLine = 1 + vm.lineMapping[editor.getPosition().lineNumber - 1];
                            var w = getOutputPane().contentWindow;
                            var d = getOutputPane().contentDocument;
                            for (var i = 0; i < d.all.length; i++) {
                                var elm = d.all[i];
                                if (elm.sourceLine == sourceLine && elm != d.body) {
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
                    _this.editor.addAction({
                        id: "lookup-on-csswg",
                        label: "Search on csswg.org",
                        contextMenuGroupId: 'navigation',
                        contextMenuOrder: 0,
                        run: function () {
                            var word = editor.getModel().getWordAtPosition(editor.getPosition()).word;
                            window.open("http://bing.com/search?q=" + word + " site:drafts.csswg.org");
                        }
                    });
                    _this.editor.addAction({
                        id: "lookup-on-msdn",
                        label: "Search on MSDN",
                        contextMenuGroupId: 'navigation',
                        contextMenuOrder: 0.1,
                        run: function () {
                            var word = editor.getModel().getWordAtPosition(editor.getPosition()).word;
                            window.open("http://bing.com/search?q=" + word + " property site:msdn.microsoft.com");
                        }
                    });
                    _this.editor.addAction({
                        id: "lookup-on-mdn",
                        label: "Search on MDN",
                        contextMenuGroupId: 'navigation',
                        contextMenuOrder: 0.2,
                        run: function () {
                            var word = editor.getModel().getWordAtPosition(editor.getPosition()).word;
                            window.open("http://bing.com/search?q=" + word + " css site:developer.mozilla.org ");
                        }
                    });
                    _this.editor.addAction({
                        id: "cssbeautify",
                        label: "Beautify the code",
                        contextMenuGroupId: 'navigation',
                        contextMenuOrder: 0.3,
                        run: function () {
                            editor.setValue(cssbeautify(editor.getValue(), { indent: '\t' }));
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
            var linkedTextbox = document.getElementById(node.attrs.id + "Textbox");
            if (document.activeElement === linkedTextbox) {
                var startPos = linkedTextbox.selectionStart;
                var endPos = linkedTextbox.selectionEnd;
                if (startPos > 0 || endPos > 0) {
                    var startLine = 0, startPosInLine = startPos;
                    var endLine = 0, endPosInLine = endPos;
                    var lines = linkedTextbox.value.split(/\n/g);
                    while (startPosInLine > lines[startLine].length) {
                        startPosInLine -= lines[startLine].length + 1;
                        startLine++;
                    }
                    while (endPosInLine > lines[endLine].length) {
                        endPosInLine -= lines[endLine].length + 1;
                        endLine++;
                    }
                    _this.editor.setSelection(new monaco.Range(1 + startLine, 1 + startPosInLine, 1 + endLine, 1 + endPosInLine));
                }
                _this.editor.focus();
            }
            redrawIfReady();
        });
    },
    onbeforeupdate: function (node, oldn) {
        var _this = this;
        // verifies that we have a text control to work with
        if (!this.editor)
            return;
        // verifies whether we need to change the text of the control
        var theNewValue$ = node.attrs["value$"];
        var theNewValue = theNewValue$();
        var cantForciblyUpdate = function () { return (_this.editor.isFocused()
            && _this.value
            && theNewValue); };
        if (theNewValue != this.value && !cantForciblyUpdate()) {
            // there was a model update
            this.isDirty = false;
            this.editor.setValue(this.value = theNewValue);
            // in this case, stop tracking the line mapping
            if (node.attrs.language === 'html') {
                vm.lineMapping = this.value.split(/\n/g).map(function (l) { return 0; });
                vm.shouldMoveToSelectedElement$(false);
            }
        }
        else if (this.isDirty) {
            // there was a content update
            theNewValue$(this.value = this.editor.getValue());
            requestAnimationFrame(function (time) { return m.redraw(); });
            this.isDirty = false;
        }
        else {
            // no update
        }
        // check whether we should move the cursor as requested by the view model
        if (vm.shouldMoveToSelectedElement$()) {
            vm.shouldMoveToSelectedElement$(false); // only one editor should take this
            var elm = vm.selectedElement$();
            var column = 0;
            try {
                column = this.editor.getValue().split(/\n/g)[elm.sourceLine - 1].match(/^\s+/)[0].length;
            }
            catch (ex) { }
            this.editor.revealLineInCenterIfOutsideViewport(elm.sourceLine);
            this.editor.setPosition({ lineNumber: elm.sourceLine, column: 1 + column });
            this.editor.focus();
        }
    }
}).from(function (a, c, s) {
    return React.createElement("monaco-text-editor", { id: a.id, language: a.language },
        React.createElement("monaco-text-editor-area", { id: a.id + 'Area' }),
        React.createElement(TextArea, { id: a.id + 'Textbox', "value$": a.value$, hidden: !!s.editor, onkeydown: enableTabInTextarea }),
        React.createElement("monaco-text-editor-placeholder", { hidden: a.value$().length > 0 }, ({
            'javascript': '// JAVASCRIPT CODE',
            'html': '<!-- HTML MARKUP -->',
            'css': '/* CSS STYLES */'
        }[a.language] || '')));
});
function enableTabInTextarea(e) {
    // tab but not ctrl+tab
    if (e.ctrlKey || e.altKey)
        return;
    if (e.keyCode == 9 || e.which == 9) {
        e.preventDefault();
        var s = this.selectionStart;
        this.value = this.value.substring(0, this.selectionStart) + "\t" + this.value.substring(this.selectionEnd);
        this.selectionStart = this.selectionEnd = s + 1;
        this.onchange(e);
    }
}
var TabButton = new Tag().from(function (a, c) {
    return React.createElement("button", __assign({}, attributesOf(a), { onclick: function (e) { return a.activePane$(a.pane); }, "aria-controls": a.pane, "aria-expanded": "" + (a.pane == a.activePane$()) }), c);
});
var ToolsPaneToolbar = new Tag().from(function (a) {
    return React.createElement("tools-pane-toolbar", { row: true, "aria-controls": a.activePane$(), role: "toolbar" },
        React.createElement(TabButton, { pane: "jsPaneWatches", "activePane$": a.activePane$ }, "Watches"),
        React.createElement(TabButton, { pane: "jsPaneConsole", "activePane$": a.activePane$ }, "Console"),
        React.createElement(TabButton, { pane: "jsPaneHeadCode", "activePane$": a.activePane$ }, "Header code"),
        React.createElement(TabButton, { pane: "jsPaneBodyCode", "activePane$": a.activePane$ }, "Body code"));
});
var ToolsPaneWatches = new Tag().with({
    onbeforeupdate: function () {
        var lastWatchFilter = vm.watchFilterText$();
        var lastWatchUpdateTime = vm.lastWatchUpdateTime$();
        var shouldUpdate = (false
            || this.lastKnownWatchUpdateTime != lastWatchUpdateTime
            || this.lastKnownWatchFilter != lastWatchFilter);
        this.lastKnownWatchUpdateTime = lastWatchUpdateTime;
        this.lastKnownWatchFilter = lastWatchFilter;
        return shouldUpdate;
    },
    getScriptTestStatusText: function (expr) {
        if (expr.status !== SCRIPT_TESTS.STATUS.PASS) {
            if (expr.message) {
                return expr.message;
            }
        }
        switch (expr.status) {
            case SCRIPT_TESTS.STATUS.PASS: return "Passed";
            case SCRIPT_TESTS.STATUS.FAIL: return "Failed";
            case SCRIPT_TESTS.STATUS.TIMEOUT: return "Timeout";
            case SCRIPT_TESTS.STATUS.NOTRUN: return "Not Run";
            default: return "Unknown Status";
        }
    },
    getScriptTestsOverallStatus: function () {
        return "Found " + vm.numberOfScriptTests$() + " tests" + (vm.numberOfScriptTests$() > 0 ? ": " + vm.numberOfSuccessfulScriptTests$() + " passing, " + vm.numberOfFailedScriptTests$() + " failed" : '') + ".";
    }
}).from(function (a, c, self) {
    return React.createElement("tools-pane-watches", { block: true, id: a.id, "is-active-pane": a.activePane$() == a.id },
        React.createElement(Input, { class: "watch-filter-textbox", "value$": vm.watchFilterText$, onkeyup: function (e) { if (e.keyCode == 27) {
                vm.watchFilterText$('');
            } }, type: "text", required: true, placeholder: "\uD83D\uDD0E", title: "Filter the watch list" }),
        React.createElement("ul", { class: "watch-list", hidden: vm.watchFilterText$() !== '' },
            React.createElement("li", null,
                React.createElement("input", { type: "checkbox", checked: vm.isScriptTestsVisible$(), title: "Uncheck to hide script test results", onchange: function (e) { vm.setChangeInScriptTestVisibility(e.target.checked); } }),
                React.createElement("input", { type: "text", disabled: true, title: self.getScriptTestsOverallStatus(), value: self.getScriptTestsOverallStatus() }),
                React.createElement("output", null))),
        React.createElement("ul", { class: "watch-list", hidden: !vm.isScriptTestsVisible$() || vm.watchFilterText$() !== '' }, vm.scriptTestResults$().map(function (expr, i, a) {
            return React.createElement("li", null,
                React.createElement("input", { type: "checkbox", checked: true, disabled: true, title: "Remove the test from your script to remove it" }),
                React.createElement("input", { type: "text", title: expr.name, value: expr.name, disabled: true, style: "color:black;" }),
                React.createElement("output", { assert: expr.status !== SCRIPT_TESTS.STATUS.PASS ? expr.status !== SCRIPT_TESTS.STATUS.NOTRUN ? 'fail' : 'none' : 'pass' }, "" + self.getScriptTestStatusText(expr)));
        })),
        vm.watchFilterText$() === '' ? React.createElement("br", null) : '',
        React.createElement("ul", { class: "watch-list" },
            React.createElement("li", null,
                React.createElement("input", { type: "checkbox", checked: true, disabled: true, title: "Uncheck to delete this watch" }),
                React.createElement("input", { type: "text", placeholder: "/* add new watch here */", onchange: function (e) { if (e.target.value) {
                        vm.addPinnedWatch(e.target.value);
                        e.target.value = '';
                        e.target.focus();
                    } } }),
                React.createElement("output", null))),
        React.createElement("ul", { class: "watch-list" }, tm.watches.map(function (expr, i, a) {
            return React.createElement("li", null,
                React.createElement("input", { type: "checkbox", checked: true, title: "Uncheck to delete this watch", onchange: function (e) { if (!e.target.checked) {
                        vm.removePinnedWatch(expr);
                        e.target.checked = true;
                    } } }),
                React.createElement(Input, { type: "text", title: expr, "value$": m.prop2(function (x) { return expr; }, function (v) { if (a[i] != v) {
                        a[i] = v;
                        requestAnimationFrame(function (then) { return vm.refreshWatches(); });
                    } }) }),
                React.createElement("output", { assert: vm.watchExpectedValues[expr] ? eval(vm.watchExpectedValues[expr]) === vm.watchValues[expr] ? 'pass' : 'fail' : 'none' }, "" + (vm.watchDisplayValues[expr] || '') + (vm.watchExpectedValues[expr] ? eval(vm.watchExpectedValues[expr]) !== vm.watchValues[expr] ? ", expected " + vm.watchExpectedValues[expr] : '' : '')),
                React.createElement("button", { class: "edit", title: "Edit the expected value", onclick: function (e) { return vm.setupExpectedValueFor(expr); } }, "edit"));
        })),
        React.createElement("ul", { class: "watch-list" }, vm.autoWatches.map(function (expr) {
            return React.createElement("li", { hidden: vm.hiddenAutoWatches[expr] || !vm.watchFilter$().matches(expr) },
                React.createElement("input", { type: "checkbox", title: "Check to pin this watch", onchange: function (e) { if (e.target.checked) {
                        vm.addPinnedWatch(expr);
                        e.target.checked = false;
                    } } }),
                React.createElement("input", { type: "text", readonly: true, title: expr, value: expr }),
                React.createElement("output", { title: "" + (vm.watchDisplayValues[expr] || '') }, "" + (vm.watchDisplayValues[expr] || '')));
        })));
});
var ToolsPaneConsole = new Tag().with({
    oncreate: function () {
        this.history = [''];
        this.historyIndex = 0;
    },
    onsumbit: function (e) {
        try {
            var inp = e.target.querySelector('input');
            var expr = inp.value;
            inp.value = '';
            // update the expression history
            this.history[this.history.length - 1] = expr;
            this.historyIndex = this.history.push("") - 1;
            // append expression to console
            appendToConsole(">", new String(expr));
            // evaluate expression
            var res = undefined;
            try {
                res = getOutputPane().contentWindow.eval(expandShorthandsIn(expr));
            }
            catch (ex) {
                res = ex;
            }
            // append result to console
            appendToConsole("=", res);
        }
        catch (ex) {
            console.error(ex);
        }
        finally {
            e.preventDefault();
            return false;
        }
    },
    onkeypress: function (e) {
        var inp = e.target;
        if (e.key == 'Up' || e.key == 'ArrowUp') {
            if (this.historyIndex > 0)
                this.historyIndex--;
            inp.value = this.history[this.historyIndex];
        }
        else if (e.key == 'Down' || e.key == 'ArrowDown') {
            if (this.historyIndex < this.history.length - 1)
                this.historyIndex++;
            inp.value = this.history[this.historyIndex];
        }
        else if (this.historyIndex == this.history.length - 1) {
            this.history[this.historyIndex] = inp.value;
        }
        else {
            // nothing to do
        }
    }
}).from(function (a, c, self) {
    return React.createElement("tools-pane-console", { id: a.id, "is-active-pane": a.activePane$() == a.id },
        React.createElement("pre", { id: a.id + "Output" }),
        React.createElement("form", { method: "POST", onsubmit: function (e) { return self.onsumbit(e); } },
            React.createElement("input", { type: "text", onkeydown: function (e) { return self.onkeypress(e); }, oninput: function (e) { return self.onkeypress(e); } })));
});
var ToolsPaneCode = new Tag().from(function (a) {
    return React.createElement("tools-pane-code", { id: a.id, "is-active-pane": a.activePane$() == a.id },
        React.createElement(MonacoTextEditor, { id: a.id + '--editor', "value$": a.value$, language: "javascript" }));
} // TODO
);
var OutputPaneCover = new Tag().with({
    shouldBeHidden: function () {
        return !vm.isPicking$() && !vm.selectedElement$();
    },
    boxStyles$: cachedCast(vm.selectedElement$, function (elm) {
        var styles = {
            marginBox: {
                position: "absolute",
                transform: "translate(0, 0)",
                borderStyle: "solid",
                borderColor: "rgba(255,0,0,0.3)"
            },
            borderBox: {
                borderStyle: "solid",
                borderColor: "rgba(0,0,0,0.3)"
            },
            paddingBox: {
                borderStyle: "solid",
                borderColor: "rgba(0,0,0,0.4)",
                backgroundColor: "rgba(0,0,0,0.5)",
                backgroundClip: "padding-box"
            },
            contentBox: {
            // nothing special
            }
        };
        if (elm) {
            var es = gCS(elm);
            // position
            styles.marginBox.display = 'block';
            styles.marginBox.top = gBCT(elm) + "px";
            styles.marginBox.left = gBCL(elm) + "px";
            // margin box
            var mt = parseInt(es.marginTop);
            var ml = parseInt(es.marginLeft);
            var mr = parseInt(es.marginRight);
            var mb = parseInt(es.marginBottom);
            styles.marginBox.transform = "translate(" + -ml + "px," + -mt + "px)";
            styles.marginBox.borderTopWidth = mt + "px";
            styles.marginBox.borderLeftWidth = ml + "px";
            styles.marginBox.borderRightWidth = mr + "px";
            styles.marginBox.borderBottomWidth = mb + "px";
            // border box
            var bt = parseInt(es.borderTopWidth);
            var bl = parseInt(es.borderLeftWidth);
            var br = parseInt(es.borderRightWidth);
            var bb = parseInt(es.borderBottomWidth);
            styles.borderBox.borderTopWidth = bt + "px";
            styles.borderBox.borderLeftWidth = bl + "px";
            styles.borderBox.borderRightWidth = br + "px";
            styles.borderBox.borderBottomWidth = bb + "px";
            // padding box
            var pt = parseInt(es.paddingTop);
            var pl = parseInt(es.paddingLeft);
            var pr = parseInt(es.paddingRight);
            var pb = parseInt(es.paddingBottom);
            styles.paddingBox.borderTopWidth = pt + "px";
            styles.paddingBox.borderLeftWidth = pl + "px";
            styles.paddingBox.borderRightWidth = pr + "px";
            styles.paddingBox.borderBottomWidth = pb + "px";
            // content box
            styles.contentBox.width = gBCW(elm) - pl - pr - bl - br + "px";
            styles.contentBox.height = gBCH(elm) - pt - pb - bt - bb + "px";
        }
        return styles;
    }),
    setCurrentElementFromClick: function (e) {
        // ie hack to hide the element that covers the iframe and prevents elementFromPoint to work
        if ("ActiveXObject" in window) {
            document.getElementById("outputPaneCover").style.display = 'none';
        }
        var elm = getOutputPane().contentDocument.elementFromPoint(e.offsetX, e.offsetY) || getOutputPane().contentDocument.documentElement;
        var shouldUpdate = vm.selectedElement$() !== elm;
        vm.selectedElement$(elm);
        // ie hack to unhide the element that covers the iframe and prevents elementFromPoint to work
        if ("ActiveXObject" in window) {
            document.getElementById("outputPaneCover").style.display = '';
        }
        if (e.type == 'pointerdown' || e.type == 'mousedown') {
            // stop picking on pointer down
            vm.isPicking$(false);
            // also, update the watches for this new element
            vm.refreshWatches(elm);
            if (elm.sourceLine) {
                vm.shouldMoveToSelectedElement$(true);
            }
            // we should always update in this case
            shouldUpdate = true;
        }
        // we kinda need a synchronous redraw to be reactive
        // and we need no redraw at all if we didn't update
        e.redraw = false;
        if (shouldUpdate) {
            m.redraw(true);
        }
    },
    getPointerOrMouseEvents: function () {
        var _this = this;
        var _a, _b;
        var onpointerdown = 'onpointerdown' in window ? 'onpointerdown' : 'onmousedown';
        var onpointermove = 'onpointermove' in window ? 'onpointermove' : 'onmousemove';
        if (this.shouldBeHidden()) {
            return _a = {},
                _a[onpointermove] = null,
                _a[onpointerdown] = null,
                _a;
        }
        if (!this.events) {
            this.events = (_b = {},
                _b[onpointermove] = function (e) { return _this.setCurrentElementFromClick(e); },
                _b[onpointerdown] = function (e) { return _this.setCurrentElementFromClick(e); },
                _b);
        }
        return this.events;
    }
}).from(function (a, c, self) {
    return React.createElement("output-pane-cover", __assign({ block: true, id: a.id, "is-active": vm.isPicking$() }, self.getPointerOrMouseEvents()),
        React.createElement("margin-box", { block: true, hidden: self.shouldBeHidden(), style: self.boxStyles$().marginBox },
            React.createElement("border-box", { block: true, style: self.boxStyles$().borderBox },
                React.createElement("padding-box", { block: true, style: self.boxStyles$().paddingBox },
                    React.createElement("content-box", { block: true, style: self.boxStyles$().contentBox })))));
});
var HTMLPane = new Tag().from(function (a) {
    return React.createElement("html-pane", { "is-focused": a.isFocused$(), "disabled-style": { 'flex-grow': tm.html ? 3 : 1 } },
        React.createElement(MonacoTextEditor, { id: "htmlPaneEditor", "value$": tm.html$, language: "html", "isFocused$": a.isFocused$ }));
});
var CSSPane = new Tag().from(function (a) {
    return React.createElement("css-pane", { "is-focused": a.isFocused$(), "disabled-style": { 'flex-grow': tm.css ? 3 : 1 } },
        React.createElement(MonacoTextEditor, { id: "cssPaneEditor", "value$": tm.css$, language: "css", "isFocused$": a.isFocused$ }));
});
var JSPane = new Tag().from(function (a) {
    return React.createElement("js-pane", { "is-focused": a.isFocused$(), "disabled-style": { 'flex-grow': tm.jsBody ? 3 : 1 } },
        React.createElement(MonacoTextEditor, { id: "jsPaneEditor", "value$": vm.jsCombined$, language: "javascript", "isFocused$": a.isFocused$ }));
});
var ToolsPane = new Tag().from(function (a) {
    return React.createElement("tools-pane", null,
        React.createElement(ToolsPaneToolbar, { "activePane$": vm.activeJsTab$ }),
        React.createElement("tools-pane-tabs", null,
            React.createElement(ToolsPaneWatches, { id: "jsPaneWatches", "activePane$": vm.activeJsTab$ }),
            React.createElement(ToolsPaneConsole, { id: "jsPaneConsole", "activePane$": vm.activeJsTab$ }),
            React.createElement(ToolsPaneCode, { id: "jsPaneHeadCode", "value$": tm.jsHead$, "activePane$": vm.activeJsTab$ }),
            React.createElement(ToolsPaneCode, { id: "jsPaneBodyCode", "value$": tm.jsBody$, "activePane$": vm.activeJsTab$ })));
});
var OutputPane = new Tag().from(function (a) {
    return React.createElement("output-pane", null,
        React.createElement("output-pane-toolbar", { role: "toolbar" },
            React.createElement("h3", null, " Rendered Result "),
            React.createElement("button", { onclick: function (e) { return vm.isPicking$(!vm.isPicking$()); } }, "\uD83D\uDD0D select element ")),
        React.createElement("iframe", { id: "outputPane", src: "about:blank", border: "0", frameborder: "0", "is-active": !vm.isPicking$() }),
        React.createElement(OutputPaneCover, { id: "outputPaneCover" }));
});
var DOMViewElement = new Tag().with({
    oncreate: function () {
        this.visible = undefined;
    },
    setSelectedElement: function (e) {
        vm.selectedElement$(e);
        vm.refreshWatches(e);
    },
    isSelectedElement: function (e) {
        return e === vm.selectedElement$();
    },
    // Computes an array of HTML text to display and indices of children elements
    // Ex.    <p> <span> Foo </span> bar <span> text </span> </p>
    //    =>  ["<p> ", 0, " bar ", 1, " </p>"]
    // Used to recursively display all elements with recursive calls to children elements.
    elementBody$: function (e) {
        if (e.children.length == 0) {
            return [e.outerHTML];
        }
        else {
            var original = e.outerHTML;
            var ret_1 = [];
            ret_1.push(original);
            var i_1 = 0;
            // Split HTML text at children elements and replace with their indices.
            Array.from(e.children).forEach(function (val) {
                for (var _i = 0, ret_2 = ret_1; _i < ret_2.length; _i++) {
                    var part = ret_2[_i];
                    if (typeof part !== 'string') {
                        continue;
                    }
                    var indexFound = part.indexOf(val.outerHTML);
                    if (indexFound == -1) {
                        continue;
                    }
                    var pre = part.slice(0, indexFound);
                    var suf = part.slice((indexFound + val.outerHTML.length));
                    var temp = [];
                    temp.push(pre);
                    temp.push(i_1);
                    temp.push(suf);
                    // Remove the part we split from the list of elements to only have the
                    // split version within the array we will be returning
                    var firstOccurrenceInRet = ret_1.indexOf(part);
                    if (firstOccurrenceInRet !== -1) {
                        ret_1.splice(firstOccurrenceInRet, 1);
                    }
                    ret_1 = ret_1.concat(temp);
                }
                i_1++;
            });
            // Ensure only html text and children element indices left
            ret_1 = ret_1.filter(function (val) { return (typeof val === 'string' && val.length > 0) || typeof val === 'number'; });
            return ret_1;
        }
    },
    isVisible: function (a) {
        if (!a.toggleable) {
            return true;
        }
        if (this.visible === undefined) {
            this.visible = (a.element.nodeName.toUpperCase() != 'HEAD');
        }
        return this.visible;
    },
    toggleVisibility: function () {
        this.visible = !this.visible;
    },
    toggleButtonText$: function () {
        if (this.visible || this.visible === undefined) {
            return "-";
        }
        else {
            return "+";
        }
    },
    toggleText$: function (child) {
        if (!this.visible) {
            if (child.childNodes.length == 0) {
                return child.outerHTML;
            }
            var childHTML = child.outerHTML;
            var prefix = childHTML.substring(0, (childHTML.indexOf(">") + 1));
            var suffix = childHTML.substring(childHTML.lastIndexOf("<"));
            return prefix + " ... " + suffix;
        }
        return "";
    }
}).from(function (a, c, self) {
    return React.createElement("dom-view-element", null,
        React.createElement("code", { "is-hidden": (!a.toggleable || a.element.childNodes.length === 0), class: "domViewTreeToggle", onclick: function () { return self.toggleVisibility(); } }, "" + self.toggleButtonText$()),
        React.createElement("ul", { class: "domViewTree" }, self.isVisible(a) ?
            React.createElement("dom-view-tree-element", { "is-hidden": !(self.isVisible(a)) }, self.elementBody$(a.element).map(function (val) {
                return React.createElement("li", null, (typeof val === 'string') ?
                    React.createElement("code", { class: "domViewTreeElement", onclick: function () { return self.setSelectedElement(a.element); }, "is-selected": self.isSelectedElement(a.element) }, val)
                    :
                        React.createElement(DOMViewElement, { element: a.element.children[val], toggleable: true }));
            }))
            :
                React.createElement("li", null,
                    React.createElement("code", { class: "domViewTreeElement", onclick: function () { return self.setSelectedElement(a.element); }, "is-selected": self.isSelectedElement(a.element) }, self.toggleText$(a.element)))));
});
var DOMViewPane = new Tag().with({
    getOutputTree: function () {
        var lastDOMTreeText = vm.domViewerHTMLText$();
        var lastDOMUpdateTime = vm.lastDOMUpdateTime$();
        var shouldUpdate = (false
            || this.lastKnownDOMUpdateTime != lastDOMUpdateTime
            || this.savedTreeText != lastDOMTreeText);
        if (!shouldUpdate) {
            return this.savedTree;
        }
        this.savedTreeText = lastDOMTreeText;
        var tree = this.savedTree = React.createElement(DOMViewElement, { element: getOutputPaneElement(), toggleable: false });
        return tree;
    }
}).from(function (a, c, self) {
    return React.createElement("dom-view-pane", null,
        React.createElement("dom-view-pane-toolbar", { role: "toolbar" },
            React.createElement("h3", null, " DOM Tree "),
            React.createElement("button", { onclick: function (e) { return vm.refreshWatches(); } }, "\u21BB refresh watches")),
        React.createElement("dom-view-tree", null,
            " ",
            self.getOutputTree(),
            " "));
});
var UserTestcasesDialog = new Tag().with({
    deleteTest: function (id) {
        vm.userTestcasesDialog.deleteTest(id);
    },
    close: function () {
        var form = vm.userTestcasesDialog;
        form.isOpened$(false);
        vm.redirectBackFromUsersTests();
    }
}).from(function (a, c, self) {
    return React.createElement("dialog", { as: "user-testcases-dialog", autofocus: true, hidden: !vm.userTestcasesDialog.isOpened$() },
        React.createElement("section", { tabindex: "-1" },
            React.createElement("h3", null,
                "Tests created by ",
                vm.userTestcasesDialog.author$()),
            React.createElement("form", { action: "POST", onsubmit: function (e) { e.preventDefault(); self.close(); } },
                React.createElement("table", null, vm.userTestcasesDialog.tests$().map(function (val) {
                    return React.createElement("tr", null,
                        React.createElement("td", { style: "padding-right:20px" },
                            React.createElement("a", { href: "/#/" + val.id }, val.id + ": " + val.title + " (" + new Date(val.creationDate) + ")")),
                        React.createElement("td", null,
                            React.createElement("button", { onclick: function () { return self.deleteTest(val.id); } }, "Delete")));
                })),
                React.createElement("footer", { style: "margin-top: 20px" },
                    React.createElement("input", { type: "submit", value: "Close" })))));
});
var SelectorGenerationDialog = new Tag().with({
    generateReplacement: function () {
        var form = vm.selectorGenerationDialog;
        var w1 = window;
        // create the requested replacement, if possible
        switch (form.chosenMode$()) {
            case "auto": {
                w1.$0replacement = w1.$0.sourceTagId;
                break;
            }
            case "id": {
                if (form.chosenId$()) {
                    // assign the id to the element if we can
                    if (w1.$0) {
                        w1.$0.id = form.chosenId$();
                    }
                    if (w1.$0 && w1.$0.sourceLine >= 1) {
                        var txt = '^(.|\r)*?';
                        var line = vm.lineMapping[w1.$0.sourceLine - 1];
                        for (var i = line; i--;) {
                            txt += '\\n(.|\r)*?';
                        }
                        txt += '\\<' + w1.$0.tagName + '\\b';
                        var reg = new RegExp(txt, 'i');
                        tm.html = tm.html.replace(reg, '$& id="' + form.chosenId$() + '"');
                        vm.run();
                        if (!window['$0'])
                            window['$0'] = { id: form.chosenId$() };
                    }
                    // then return the value
                    w1.$0replacement = "$(" + JSON.stringify('#' + form.chosenId$()) + ")";
                }
                break;
            }
            case "selector": {
                if (form.chosenSelector$()) {
                    w1.$0replacement = "$(" + JSON.stringify(form.chosenSelector$()) + ")";
                }
                break;
            }
        }
        form.isOpened$(false);
        if (form.watchValue$().defined) {
            vm.addPinnedWatch(form.watchExpression$(), form.watchValue$().value);
        }
        else {
            vm.addPinnedWatch(form.watchExpression$());
        }
    }
}).from(function (a, s, self) {
    return React.createElement("dialog", { as: "selector-generation-dialog", autofocus: true, hidden: !vm.selectorGenerationDialog.isOpened$() },
        React.createElement("section", { tabindex: "-1" },
            React.createElement("h1", null, "How do you want to do this?"),
            React.createElement("form", { action: "POST", onsubmit: function (e) { e.preventDefault(); self.generateReplacement(); } },
                React.createElement("label", { hidden: !vm.selectorGenerationDialog.isAutoAvailable$(), style: "display: block; margin-bottom: 10px" },
                    React.createElement(InputRadio, { name: "chosenMode", value: "auto", "checkedValue$": vm.selectorGenerationDialog.chosenMode$ }),
                    "Use the source index"),
                React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                    React.createElement(InputRadio, { name: "chosenMode", value: "id", "checkedValue$": vm.selectorGenerationDialog.chosenMode$ }),
                    "Assign an id the the element",
                    React.createElement(Input, { type: "text", "value$": vm.selectorGenerationDialog.chosenId$, onfocus: function (e) { return vm.selectorGenerationDialog.chosenMode$('id'); } })),
                React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                    React.createElement(InputRadio, { name: "chosenMode", value: "selector", "checkedValue$": vm.selectorGenerationDialog.chosenMode$ }),
                    "Use a css selector",
                    React.createElement(Input, { type: "text", "value$": vm.selectorGenerationDialog.chosenSelector$, onfocus: function (e) { return vm.selectorGenerationDialog.chosenMode$('selector'); } })),
                React.createElement("footer", { style: "margin-top: 20px" },
                    React.createElement("input", { type: "submit", value: "OK" }),
                    "\u00A0",
                    React.createElement("input", { type: "button", value: "Cancel", onclick: function (e) { return vm.selectorGenerationDialog.isOpened$(false); } })))));
});
var DeletedUserDialog = new Tag().with({
    close: function () {
        var form = vm.deletedUserDialog;
        form.isOpened$(false);
    }
}).from(function (a, s, self) {
    return React.createElement("dialog", { as: "deleted-user-dialog", autofocus: true, hidden: !vm.deletedUserDialog.isOpened$() },
        React.createElement("section", { tabindex: "-1" },
            React.createElement("h1", null, "Successfully removed your account!"),
            React.createElement("form", { action: "POST", onsubmit: function (e) { e.preventDefault(); self.close(); } },
                React.createElement("p", null,
                    "Successfully deleted your account: ",
                    React.createElement("b", null, vm.deletedUserDialog.deletedUser$()),
                    " from wptest.center. All tests created by you no longer have your name associated with them, but instead are now associated with randomly assigned anonymous name: ",
                    React.createElement("b", null, vm.deletedUserDialog.newAnonymousUser$()),
                    "."),
                React.createElement("p", null,
                    "To view and delete your tests please go to ",
                    React.createElement("a", { href: "/#/u/" + vm.deletedUserDialog.newAnonymousUser$() },
                        "wptest.center/#/u/",
                        vm.deletedUserDialog.newAnonymousUser$()),
                    " to see a list of tests that you can delete. ",
                    React.createElement("b", null, "Please save this link for future reference to delete your tests.")),
                React.createElement("footer", { style: "margin-top: 20px" },
                    React.createElement("input", { type: "submit", value: " Got it! " })))));
});
var SettingsDialog = new Tag().with({
    onupdate: function (vnode) {
        handleAutofocus(vm.settingsDialog.shouldGetFocus$, vnode.dom);
    },
    close: function () {
        var form = vm.settingsDialog;
        form.isOpened$(false);
    },
    deleteUser: function () {
        var confirmed = confirm("Are you sure you want to delete your account?");
        if (confirmed) {
            vm.settingsDialog.deleteUser();
            vm.settingsDialog.close();
            vm.deletedUserDialog.open();
        }
    }
}).from(function (a, s, self) {
    return React.createElement("dialog", { as: "settings-dialog", autofocus: true, hidden: !vm.settingsDialog.isOpened$() },
        React.createElement("section", { tabindex: "-1" },
            React.createElement("h1", null, "Settings"),
            React.createElement("form", { action: "POST", onsubmit: function (e) { e.preventDefault(); self.close(); } },
                React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                    React.createElement("button", { onclick: function (e) { return vm.settingsDialog.openWelcomeDialog(); } },
                        React.createElement("span", { class: "icon" }, "\uD83D\uDEC8"),
                        "Open the welcome screen")),
                React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                    React.createElement("button", { onclick: function (e) { return vm.settingsDialog.openSearchDialog(); } },
                        React.createElement("span", { class: "icon" }, "\uD83D\uDD0E"),
                        "Search existing test cases")),
                React.createElement("hr", null),
                React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                    React.createElement("button", { hidden: !vm.githubIsConnected$(), onclick: function (e) { return vm.redirectToUsersTests(vm.githubUserName$()); } },
                        React.createElement("span", { class: "icon" }, "\uD83D\uDCC1"),
                        "See testcases made by you, ",
                        vm.githubUserName$(),
                        ".")),
                React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                    React.createElement("button", { hidden: vm.githubIsConnected$(), onclick: function (e) { return vm.settingsDialog.logIn(); } },
                        React.createElement("span", { class: "icon" }, "\uD83D\uDD12"),
                        "Log In using your Github account"),
                    React.createElement("button", { hidden: !vm.githubIsConnected$(), onclick: function (e) { return vm.settingsDialog.logOut(); } },
                        React.createElement("span", { class: "icon" }, "\uD83D\uDD12"),
                        "Log Out of your Github account (",
                        vm.githubUserName$(),
                        ")")),
                React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                    React.createElement("button", { hidden: !vm.githubIsConnected$(), onclick: function (e) { return self.deleteUser(); } },
                        React.createElement("span", { class: "icon" }, "\u26D4\uFE0F"),
                        "Remove your account (",
                        vm.githubUserName$(),
                        ") from editor")),
                React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                    React.createElement("a", { style: "display: block", href: "https://github.com/web-platform-tests/editor", target: "_blank" },
                        React.createElement("span", { class: "icon" }, "\uD83C\uDF74"),
                        "Contribute and/or fork this site on Github")),
                "\t\t\t\t",
                React.createElement("hr", null),
                React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                    React.createElement("button", { hidden: !vm.settingsDialog.useMonaco$(), onclick: function (e) { return vm.settingsDialog.useMonaco$(false); }, style: "display: block" },
                        React.createElement("span", { class: "icon" }, "\u2699"),
                        "Disable the advanced text editor on this device from now on"),
                    React.createElement("button", { hidden: vm.settingsDialog.useMonaco$(), onclick: function (e) { return vm.settingsDialog.useMonaco$(true); }, style: "display: block" },
                        React.createElement("span", { class: "icon" }, "\u2699"),
                        "Enable the advanced text editor on this device from now on")),
                React.createElement("footer", { style: "margin-top: 20px" },
                    React.createElement("input", { type: "submit", value: "Close" })))));
});
var SearchDialog = new Tag().with({
    onupdate: function (vnode) {
        handleAutofocus(vm.searchDialog.shouldGetFocus$, vnode.dom);
    },
    search: function () {
        var form = vm.searchDialog;
        form.searchUrl$('/search?q=' + encodeURIComponent(form.searchTerms$()) + '&time=' + Date.now());
    },
    close: function () {
        var form = vm.searchDialog;
        form.isOpened$(false);
    },
}).from(function (a, s, self) {
    return React.createElement("dialog", { as: "search-dialog", autofocus: true, hidden: !vm.searchDialog.isOpened$() },
        React.createElement("section", { tabindex: "-1", role: "search", style: "width: 80%; width: 80vw" },
            React.createElement("h1", null, "Search testcases"),
            React.createElement("form", { action: "POST", onsubmit: function (e) { e.preventDefault(); self.search(); } },
                React.createElement("p", { style: "font-size: 10px" }, "Search terms are separated by spaces, and must all match for the result to be returned; You can use the --html --css --js --author modifiers to narrow down the search. Out of these, only --author considers its arguments as alternatives."),
                React.createElement("p", { style: "font-size: 10px; color: green;" }, "Example: \"table --css border hidden --author FremyCompany gregwhitworth\" will return all test cases containing \"table\" in any code field, containing both border & hidden in their css code, and that have been written by FremyCompany or gregwhitworth."),
                React.createElement("div", { style: "display: flex;" },
                    React.createElement(Input, { placeholder: "search terms here", "value$": vm.searchDialog.searchTerms$, style: "flex: 1 0 0px" }),
                    React.createElement("input", { type: "submit", value: "Search" })),
                React.createElement("iframe", { frameborder: "0", border: "0", src: vm.searchDialog.searchUrl$() }),
                React.createElement("footer", { style: "margin-top: 5px" },
                    React.createElement("input", { type: "button", onclick: function (e) { return self.close(); }, value: "Close" })))));
});
var WelcomeDialog = new Tag().with({
    onupdate: function (vnode) {
        handleAutofocus((function (v) { return vm.welcomeDialog.isOpened$(); }), vnode.dom);
    },
    close: function () {
        var form = vm.welcomeDialog;
        localStorage.setItem('noWelcome', 'true');
        form.isOpened$(false);
    }
}).from(function (a, s, self) {
    return React.createElement("dialog", { as: "welcome-dialog", hidden: !vm.welcomeDialog.isOpened$() },
        React.createElement("section", { tabindex: "-1" },
            React.createElement("h1", null, "The Web Platform Test Center"),
            React.createElement("form", { action: "POST", onsubmit: function (e) { e.preventDefault(); self.close(); } },
                React.createElement("p", null, "This websites provides tools to simplify the creation of reduced web platform test cases and the search of previously-written test cases."),
                React.createElement("p", null, "It is primarily addressed at engineers who build web browsers, and web developers who want to help bugs getting fixed by filing reduced issues on existing browsers."),
                React.createElement("footer", { style: "margin-top: 20px" },
                    React.createElement("input", { type: "submit", value: " Got it! ", autofocus: true })))));
});
var ExportDialog = new Tag().with({
    onupdate: function (vnode) {
        handleAutofocus(vm.exportDialog.shouldGetFocus$, vnode.dom);
    },
    close: function () {
        var dialog = vm.exportDialog;
        dialog.isOpened$(false);
    },
    onbeforesubmit: function () {
        var dialog = vm.exportDialog;
        dialog.exportValues(tm);
    },
    onsubmit: function (e) {
        var _this = this;
        // make sure we sync before going any further
        this.onbeforesubmit();
        // update the form submission info
        this.fileContent = vm.saveToFileString();
        if (!/[.](html|htm|xht|xhtml)$/i.test(vm.exportDialog.fileName$())) {
            this.fileName = vm.exportDialog.fileName$() + '.html';
        }
        else {
            this.fileName = vm.exportDialog.fileName$();
        }
        // close the dialog once submission is done
        setTimeout(function (time) { return _this.close(); }, 100);
    },
}).from(function (a, s, self) {
    return React.createElement("dialog", { as: "export-dialog", hidden: !vm.exportDialog.isOpened$() },
        React.createElement("section", { tabindex: "-1" },
            React.createElement("h1", null, "Exporting your test"),
            React.createElement("form", { method: "GET", action: "https://github.com/web-platform-tests/wpt/new/master/" + vm.exportDialog.filePath$(), target: "_blank", onsubmit: function (e) { return self.onsubmit(e); }, style: "font-size: 87.5%" },
                React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                    "Test title:",
                    React.createElement("br", null),
                    React.createElement(Input, { name: "message", "value$": vm.exportDialog.title$, autofocus: /^(|UntitledTest)$/.test(vm.exportDialog.title$()), style: "width: 400px" })),
                React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                    "File name:",
                    React.createElement("br", null),
                    React.createElement(Input, { "value$": vm.exportDialog.fileName$, autocomplete: "off", autofocus: /^(|testcase)$/.test(vm.exportDialog.fileName$()), style: "width: 400px" })),
                React.createElement("label", { style: "display: block; margin-bottom: 10px" },
                    "Test folder path:",
                    React.createElement("br", null),
                    React.createElement(Input, { "value$": vm.exportDialog.filePath$, autocomplete: "off", autofocus: /^()$/.test(vm.exportDialog.filePath$()), style: "width: 400px" })),
                React.createElement("input", { type: "hidden", name: "filename", value: self.fileName }),
                React.createElement("input", { type: "hidden", name: "value", value: self.fileContent }),
                React.createElement("footer", { style: "margin-top: 20px" },
                    React.createElement("input", { type: "button", value: "Download", onclick: function (e) { self.onbeforesubmit(); vm.saveToFile(); self.close(); } }),
                    "\u00A0",
                    React.createElement("input", { type: "submit", value: "Create pull request", autofocus: true }),
                    "\u00A0",
                    React.createElement("input", { type: "button", value: "Close", onclick: function (e) { return self.close(); } })))));
});
var TestEditorView = new Tag().from(function (a) {
    // check if url pointing to an user instead of test
    if (location.hash.substr(2, 2) === 'u/') {
        vm.closeAllDialogs();
        vm.userTestcasesDialog.open();
        vm.userTestcasesDialog.updateAuthorOfTestcases(location.hash.substr(4));
    }
    // if the page moved to a new id 
    // then we need to reset all data and download the new test
    else if (a.id != vm.currentTestId$() && (a.id == location.hash.substr(2) || (a.id.substr(0, 5) == 'json:' && location.hash.substr(0, 7) == '#/json:'))) {
        vm.currentTestId$(a.id);
        vm.closeAllDialogs();
        var id = a.id;
        if (id == 'local:save') {
            id = sessionStorage.getItem(id) || (localStorage.getItem('local:save') ? 'local:save' : 'new');
            vm.currentTestId$(id);
            vm.updateURLForTest();
        }
        if (id.indexOf('local:') == 0) {
            try {
                vm.openFromJSON(JSON.parse(localStorage.getItem(id)));
            }
            catch (ex) {
                alert("An error occurred while trying to load that test. Is it still in your local storage?");
            }
            // when we recover the local:save test, we should offer to save online
            if (a.id == 'local:save') {
                sessionStorage.removeItem('local:save');
                localStorage.removeItem('local:save');
                if (id != 'local:save' && vm.githubIsConnected$()) {
                    setTimeout(function () {
                        if (confirm("Welcome back, " + vm.githubUserName$() + "! Should we save your test online now?")) {
                            localStorage.removeItem(id);
                            vm.saveOnline();
                        }
                    }, 32);
                }
            }
        }
        else if (id.indexOf('json:') == 0) {
            vm.openFromJSON(JSON.parse(decodeHash(location.hash.substr('#/json:'.length))));
        }
        else if (id && id != 'new') {
            vm.isLoading$(true);
            vm.openFromJSON(null);
            fetch('/uploads/' + id + '.json').then(function (r) { return r.json(); }).then(function (d) {
                vm.openFromJSON(d);
            });
        }
    }
    // in all cases, we return the same markup though to avoid trashing
    return (React.createElement("body", null,
        React.createElement("main", { inert: vm.isAnyDialogOpen$() },
            React.createElement(BodyToolbar, { model: tm }),
            React.createElement("top-row", { row: true },
                React.createElement(HTMLPane, { "isFocused$": vm.isHtmlPaneFocused$ }),
                React.createElement(CSSPane, { "isFocused$": vm.isCssPaneFocused$ }),
                React.createElement(JSPane, { "isFocused$": vm.isJsPaneFocused$ })),
            React.createElement("bottom-row", { row: true },
                React.createElement(OutputPane, null),
                React.createElement(DOMViewPane, null),
                React.createElement(ToolsPane, null))),
        React.createElement(UserTestcasesDialog, null),
        React.createElement(SelectorGenerationDialog, null),
        React.createElement(SettingsDialog, null),
        React.createElement(DeletedUserDialog, null),
        React.createElement(SearchDialog, null),
        React.createElement(WelcomeDialog, null),
        React.createElement(ExportDialog, null))).children;
});
m.route(document.body, '/new', { '/:id...': TestEditorView(), '/u/:author...': TestEditorView() });
//----------------------------------------------------------------
setInterval(updatePageTitle, 3000);
function updatePageTitle() {
    var titlePart = '';
    var urlPart = '';
    var id = vm.currentTestId$();
    if (id && id != 'new' && id.substr(0, 5) != 'json:') {
        urlPart = 'wptest.center/#/' + id;
    }
    else {
        urlPart = 'wptest.center';
    }
    if (tm.title && tm.title != 'UntitledTest') {
        titlePart = tm.title + ' - ';
    }
    document.title = titlePart + urlPart;
}
