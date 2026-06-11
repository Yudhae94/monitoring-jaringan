@echo off
setlocal

REM ==============================
REM Flask + Scapy Network Monitor (Windows)
REM ==============================

set PORT=5000
set HOST=127.0.0.1

REM Optional env vars:
REM set MONITOR_INTERFACE=Ethernet
REM set MONITOR_FILTER=tcp
REM set ALERT_THRESHOLD_MBPS=10

if not exist .\venv (
  python -m venv venv
)

call venv\Scripts\activate

python -m pip install --upgrade pip
pip install -r requirements.txt

echo Starting server...
python -m app

goto :eof

