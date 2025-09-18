# UI Setup Guide

This guide outlines the steps to set up and run the Brand X Inventory Forecasting UI.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** (LTS version recommended)
*   **npm** (Node Package Manager) or **Yarn**
*   **Python 3.8+**
*   **pip** (Python Package Installer)
*   **Poetry** (for backend dependencies)
*   **Git**

## 1. Backend Setup

Ensure your FastAPI backend is running. Refer to the main `README.md` for detailed instructions on setting up and starting the backend. The UI expects the backend to be running on `http://localhost:8001`.

## 2. Frontend Setup

Navigate to the `ui` directory:

```bash
cd ui
```

### 2.1. Install Dependencies

Install the necessary Node.js packages:

```bash
npm install
# or if you prefer Yarn
yarn install
```

### 2.2. Start the Development Server

To start the React development server:

```bash
npm start
# or
yarn start
```

This will open the application in your default browser at `http://localhost:3000`.

## 3. Building for Production

To create a production-ready build of the UI:

```bash
npm run build
# or
yarn build
```

The build artifacts will be located in the `build` directory.

## 4. `setup_ui.sh` Script

To automate the frontend setup, you can use the `setup_ui.sh` script. This script will:

1.  Navigate to the `ui` directory.
2.  Install npm dependencies.
3.  Start the React development server.

Execute the script from the project root:

```bash
bash setup_ui.sh
```
