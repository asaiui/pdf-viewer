# CLAUDE.md
必ず日本語で返して
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Japanese PDF viewer web application (`情報科学専門学校 学校案内 2026`) designed to display a school brochure PDF with interactive navigation. It's a Progressive Web App (PWA) built with vanilla JavaScript, HTML, and CSS.

## Architecture

The application follows a modular architecture with a main controller class coordinating specialized modules:

- **ISCPDFViewer** (main.js) - Main application controller that orchestrates all modules
- **PDFLoader** (pdf-loader.js) - Handles PDF loading, rendering, and file management using PDF.js
- **PageNavigator** (page-navigator.js) - Manages page navigation, controls, and keyboard shortcuts
- **ZoomManager** (zoom-manager.js) - Controls zoom functionality and canvas scaling
- **FullscreenManager** (fullscreen-manager.js) - Handles fullscreen mode and related controls
- **ContentAnalyzer** (content-analyzer.js) - Analyzes PDF content for table of contents generation
- **MobileMenu** (mobile-menu.js) - Manages mobile responsive navigation
- **DemoContent** (demo-content.js) - Provides fallback content when PDF loading fails

## Key Features

- PDF.js integration for client-side PDF rendering
- Responsive design with mobile-first approach
- Keyboard shortcuts support
- Fullscreen viewing mode
- Zoom controls with fit-to-width/page options
- Interactive table of contents with page navigation
- Progressive loading with fallback demo content
- PWA capabilities with manifest.json

## Development Commands

Since this is a frontend-only application with no build process:

- **Local Development**: Use any static file server (e.g., `python -m http.server`, `npx serve`, or VS Code Live Server)
- **Testing**: Open in browser and test functionality manually
- **Deployment**: Deploy static files to any web server or GitHub Pages

## File Structure

- `index.html` - Main application entry point
- `style.css` - Complete styling including responsive design and dark mode
- `js/` - Modular JavaScript components
- `pdf/` - Contains the target PDF file (`school-guide-2026.pdf`)
- `manifest.json` - PWA configuration

## Important Implementation Details

### PDF Loading Strategy
The application attempts to load PDFs from multiple paths and falls back to demo content if loading fails. PDF.js is loaded from CDN (v3.11.174).

### Responsive Behavior
- Desktop: Sidebar + main content layout
- Mobile: Collapsible hamburger menu with overlay
- The layout uses CSS Grid/Flexbox with media queries
- Mobile breakpoint at 768px

### Module Communication
All modules receive a reference to the main viewer instance, allowing cross-module communication through the central controller.

### Error Handling
The application gracefully degrades to demo content when the PDF file is unavailable, making it suitable for development without the actual PDF file.

### Browser Requirements
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- iOS Safari 14+, Android Chrome 90+

### Key Configuration Values
- Primary brand color: #0066CC (ISC Blue)
- Accent color: #FF6600 (Orange)
- Default zoom: 1.2x
- Mobile breakpoint: 768px