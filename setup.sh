#!/bin/bash

echo "Setting up the project..."

# Setup shared package
echo "Setting up shared package..."
cd shared
npm i
npm run build
npm link
cd ..

# Setup backend
echo "Setting up backend..."
cd backend
npm i
echo "Linking shared package to backend..."
npm link shared
echo "Building backend..."
npm run build
cd ..

# Setup frontend
echo "Setting up frontend..."
cd frontendSvelte
npm i
echo "Linking shared package to frontend..."
npm link shared
echo "Building frontend..."
npm run build
cd ..

echo "Setup complete!"