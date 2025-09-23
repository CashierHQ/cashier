
# Starts the frontend locally
[group('run')]
start_frontend:
  cd {{FRONTEND_DIR}} && npm start

# Starts the new frontend locally
[group('run')]
start_frontend_new:
  cd {{FRONTEND_DIR_NEW}} && npm run dev

