# CLAUDE.md
必ず日本語で返して
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Japanese PDF/SVG viewer web application (`情報科学専門学校 学校案内 2026`) designed to display a school brochure with interactive navigation. It's a Progressive Web App (PWA) built with vanilla JavaScript, HTML, and CSS that supports both PDF and SVG rendering modes.

## Architecture

The application follows a modular architecture with a main controller class coordinating specialized modules:

### Core System
- **ISCPDFViewer** (main.js) - Main application controller that orchestrates all modules
- **SVGViewer** (svg-viewer.js) - High-performance SVG rendering system with caching and preload
- **PDFLoader** (pdf-loader.js) - Handles PDF loading, rendering, and file management using PDF.js
- **CDNManager** (cdn-manager.js) - Manages external library loading and fallbacks

### UI & Navigation
- **PageNavigator** (page-navigator.js) - Manages page navigation, controls, and keyboard shortcuts
- **ZoomManager** (zoom-manager.js) - Controls zoom functionality and canvas scaling
- **FullscreenManager** (fullscreen-manager.js) - Handles fullscreen mode and related controls
- **MobileMenu** (mobile-menu.js) - Enhanced mobile navigation with swipe gestures and focus trap

### Responsive & Touch
- **TouchGestureManager** (touch-gesture-manager.js) - Touch and swipe gesture handling
- **ResponsiveLayoutManager** (responsive-layout-manager.js) - Adaptive layout management

### Performance & Analytics
- **ContentAnalyzer** (content-analyzer.js) - Analyzes content for table of contents generation
- **PerformanceMonitor** (performance-monitor.js) - Real-time performance tracking
- **IntelligentPrefetch** (intelligent-prefetch.js) - Smart content preloading
- **AdaptiveQuality** (adaptive-quality.js) - Dynamic quality adjustment

### Advanced Features
- **ProgressiveLoader** (progressive-loader.js) - Chunked loading for large files
- **ParallelRenderer** (parallel-renderer.js) - Multi-threaded rendering support
- **RenderWorker** (render-worker.js) - Web Worker for background processing
- **RealtimeDashboard** (realtime-dashboard.js) - Development monitoring dashboard

## Development Commands

Since this is a frontend-only application with no build process:

- **Local Development**: Use any static file server (e.g., `python -m http.server`, `npx serve`, or VS Code Live Server)
- **Testing**: Open in browser and test functionality manually
- **Deployment**: Deploy static files to any web server or GitHub Pages

## File Structure

- `index.html` - Main application entry point with comprehensive table of contents
- `style.css` - Complete responsive styling with mobile-first approach
- `js/` - Modular JavaScript components (20+ modules)
- `SVG/` - SVG files with naming pattern `入案圧縮-NNNN.svg`
- `pdf/` - Contains the target PDF file (`test.pdf`)
- `manifest.json` - PWA configuration with shortcuts and icons

## Important Implementation Details

### Dual Rendering Mode
The application supports both PDF and SVG rendering:
- **SVG Mode**: Primary mode using optimized SVG files from `SVG/` directory
- **PDF Mode**: Fallback using PDF.js when SVG files are unavailable
- **Demo Mode**: Fallback content when both PDF and SVG are unavailable

### SVG Loading Strategy
SVG files are loaded from `SVG/入案圧縮-NNNN.svg` with:
- Intelligent caching system (max 10 files)
- Preload queue for adjacent pages
- Optimized SVG element processing with responsive attributes

### Responsive Architecture
- **Desktop (1024px+)**: Full sidebar + main content layout
- **Tablet (769px-1023px)**: Collapsible sidebar with overlay
- **Mobile (481px-768px)**: Hamburger menu with enhanced mobile controls
- **Small Mobile (≤480px)**: Compact layout with minimal controls

### Performance Optimization
- **Lazy Loading**: Pages loaded on-demand with intelligent prefetching
- **Memory Management**: LRU cache for SVG elements
- **Progressive Enhancement**: Features added based on device capabilities
- **Worker Threading**: Background processing for intensive operations

### Touch & Gesture Support
- **Swipe Navigation**: Left/right swipe for page navigation
- **Pinch Zoom**: Native zoom gestures on touch devices
- **Focus Management**: Proper focus trap for mobile menu
- **Accessibility**: Full keyboard navigation and screen reader support

### Module Communication Pattern
All modules receive a reference to the main viewer instance (`this.viewer`), enabling:
- Cross-module event communication
- Centralized state management
- Consistent error handling
- Shared DOM element access

### Error Handling Strategy
The application implements graceful degradation:
1. **Primary**: SVG rendering from dedicated files
2. **Secondary**: PDF.js fallback rendering
3. **Tertiary**: Demo content with static pages
4. **Quaternary**: Error page with user guidance

### Browser Requirements
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- iOS Safari 14+, Android Chrome 90+
- JavaScript ES2020+ features required
- Web Workers and Fetch API support

### Key Configuration Values
- Primary brand color: #0066CC (ISC Blue)
- Accent color: #FF6600 (Orange)
- Default zoom: 1.2x
- Mobile breakpoint: 768px
- SVG cache size: 10 files
- Total pages: 30 (configurable in main.js)

### PWA Features
- Installable app with manifest.json
- Offline-capable (partial)
- App shortcuts for quick navigation
- Custom icons and branding
- Native-like experience on mobile devices