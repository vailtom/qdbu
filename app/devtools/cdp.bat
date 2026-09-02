@echo off
rem Wrapper: node com WebSocket habilitado (necessario no Node 20).
node --experimental-websocket "%~dp0cdp.mjs" %*
