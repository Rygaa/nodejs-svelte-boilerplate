# Windows PowerShell setup script

Write-Host "Setting up the project..." -ForegroundColor Green

# Setup shared package
Write-Host "Setting up shared package..." -ForegroundColor Yellow
Set-Location shared
npm i
npm run build
npm link
Set-Location ..

# Setup backend
Write-Host "Setting up backend..." -ForegroundColor Yellow
Set-Location backend
npm i
Write-Host "Linking shared package to backend..." -ForegroundColor Cyan
npm link shared
Write-Host "Building backend..." -ForegroundColor Cyan
npm run build
Set-Location ..

# Setup frontend
Write-Host "Setting up frontend..." -ForegroundColor Yellow
Set-Location frontendSvelte
npm i
Write-Host "Linking shared package to frontend..." -ForegroundColor Cyan
npm link shared
Write-Host "Building frontend..." -ForegroundColor Cyan
npm run build
Set-Location ..

Write-Host "Setup complete!" -ForegroundColor Green