@echo off
tsc .\wwwroot\src\editor.tsx --jsx react --lib DOM,ES2018,DOM.Iterable,ScriptHost --target es5 --out .\wwwroot\bin\editor.js