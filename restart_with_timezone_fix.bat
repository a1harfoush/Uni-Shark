@echo off
echo Stopping DULMS Watcher containers...
docker-compose down

echo Rebuilding containers with Cairo timezone fix...
docker-compose build --no-cache

echo Starting containers with proper timezone configuration...
docker-compose up -d

echo Checking container status...
docker-compose ps

echo.
echo Verifying timezone in containers...
docker exec dulms_watcher-api-1 date
echo.

echo Timezone fix applied! All containers should now use Africa/Cairo timezone.
echo Check the logs with: docker-compose logs -f
pause