#!/bin/bash

echo "Setting up the project..."

# Setup shared package
echo "Setting up shared package..."
cd shared
pnpm i
pnpm run build
pnpm link
cd ..

# Setup backend
echo "Setting up backend..."
cd backend
pnpm i
echo "Linking shared package to backend..."
pnpm link shared
echo "Building backend..."
pnpm run build
cd ..

# Setup frontend
echo "Setting up frontend..."
cd frontendSvelte
pnpm i
echo "Linking shared package to frontend..."
pnpm link shared
echo "Building frontend..."
pnpm run build
cd ..

echo "Setup complete!"