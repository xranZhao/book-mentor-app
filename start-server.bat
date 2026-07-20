@echo off
echo Starting Book Mentor local server...
echo.
echo Open http://localhost:8080 in your browser
echo Press Ctrl+C to stop
echo.
python -m http.server 8080
pause
