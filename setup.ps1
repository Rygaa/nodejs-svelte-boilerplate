# Windows PowerShell setup script

Write-Host "Setting up the project..." -ForegroundColor Green

# Setup shared package
Write-Host "Setting up shared package..." -ForegroundColor Yellow
Set-Location shared
pnpm i
pnpm run build
pnpm link
Set-Location ..

# Setup backend
Write-Host "Setting up backend..." -ForegroundColor Yellow
Set-Location backend
pnpm i
Write-Host "Linking shared package to backend..." -ForegroundColor Cyan
pnpm link shared
Write-Host "Building backend..." -ForegroundColor Cyan
pnpm run build
Set-Location ..

# Setup frontend
Write-Host "Setting up frontend..." -ForegroundColor Yellow
Set-Location frontendSvelte
pnpm i
Write-Host "Linking shared package to frontend..." -ForegroundColor Cyan
pnpm link shared
Write-Host "Building frontend..." -ForegroundColor Cyan
pnpm run build
Set-Location ..

Write-Host "Setup complete!" -ForegroundColor Green