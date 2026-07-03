@echo off
set PYTHONPATH=%PYTHONPATH%;C:\Program Files\Apache24\htdocs\BioMetric-Django-Backend
cd /d "C:\Program Files\Apache24\htdocs\BioMetric-Django-Backend"
call "C:\Program Files\Apache24\htdocs\BioMetric-Django-Backend\venv\Scripts\activate.bat"
start /b "" "C:\Program Files\Apache24\htdocs\BioMetric-Django-Backend\venv\Scripts\waitress-serve.exe" --host=0.0.0.0 --port=9002 hris.wsgi:application >> "C:\Program Files\Apache24\htdocs\BioMetric-Django-Backend\waitress.log" 2>&1